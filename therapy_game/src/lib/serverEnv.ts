import fs from "node:fs";
import path from "node:path";

function parseEnvLine(line: string): [string, string] | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
        return null;
    }

    const normalized = trimmed.startsWith("export ")
        ? trimmed.slice("export ".length).trim()
        : trimmed;

    const equalsIndex = normalized.indexOf("=");
    if (equalsIndex <= 0) {
        return null;
    }

    const key = normalized.slice(0, equalsIndex).trim();
    if (!key) {
        return null;
    }

    let value = normalized.slice(equalsIndex + 1).trim();
    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        value = value.slice(1, -1);
    }

    return [key, value];
}

function parseKnownEnvFiles(): Record<string, string> {
    const parsedEnvValues: Record<string, string> = {};
    const candidates = [
        path.resolve(process.cwd(), ".env.local"),
        path.resolve(process.cwd(), ".env"),
        path.resolve(process.cwd(), "..", ".env.local"),
        path.resolve(process.cwd(), "..", ".env"),
    ];

    for (const filePath of candidates) {
        if (!fs.existsSync(filePath)) {
            continue;
        }

        const content = fs.readFileSync(filePath, "utf8");
        for (const line of content.split(/\r?\n/)) {
            const parsed = parseEnvLine(line);
            if (!parsed) {
                continue;
            }

            const [key, value] = parsed;
            if (!(key in parsedEnvValues)) {
                parsedEnvValues[key] = value;
            }
        }
    }

    return parsedEnvValues;
}

export function hydrateServerEnv(prefixes: string[]): void {
    const parsedEnvValues = parseKnownEnvFiles();

    for (const [key, value] of Object.entries(parsedEnvValues)) {
        if (!prefixes.some((prefix) => key.startsWith(prefix))) {
            continue;
        }

        if (!process.env[key]) {
            process.env[key] = value;
        }
    }
}
