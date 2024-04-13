import { Config } from "./config";
import { load } from "./util";

export class ConfigInstance {
    private static config: Config|null = null;

    public static get Inst() {
        if (ConfigInstance.config === null) {
            throw new Error('ConfigInstance uninitialized')   
        }
        return ConfigInstance.config;
    }

    public static async init() : Promise<void> {
        ConfigInstance.config = await load();
    }
} 