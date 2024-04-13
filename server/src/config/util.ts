import { createGenerator } from "ts-json-schema-generator";
import { Config } from "./config";
import path from 'path';
import Ajv from 'ajv';
import fs, { constants } from 'fs/promises';
import { parse } from 'yaml'


export const load = async () : Promise<Config> => {
    const root = process.cwd();
    
    // Read YAML
    const cfgPath = path.join(root, "config.yaml");
    try {
        await fs.access(cfgPath, constants.R_OK | constants.W_OK);
    } catch (error) {
        throw new Error(`Failed to access config at ${cfgPath}`)
    }
    
    const cfgYaml = await fs.readFile(cfgPath, {encoding: "utf8"})
    // Parse YAML
    const cfg = parse(cfgYaml)

    // Generate schema from source
    const schema = createGenerator({
        path: path.join(root, "src", "config", "config.ts"),
        tsconfig: path.join(root, "tsconfig.json"),
        type: "Config"
    }).createSchema("Config");

    // Validate YAML against schema
    const validate = new Ajv().compile(schema);
    if (!validate(cfg)) {
        const msg = validate.errors[0].message ?? "YAML error";
        const path = validate.errors[0].instancePath;
        throw new Error(`${path}: ${msg}`)
    }
    return cfg as Config
}