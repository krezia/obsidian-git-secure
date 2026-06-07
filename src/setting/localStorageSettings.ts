import { Platform } from "obsidian";
import type { App } from "obsidian";
import type ObsidianGit from "../main";

// Session-scoped credentials for mobile — never written to localStorage
let _mobilePassword: string | null = null;
let _mobileUsername: string | null = null;

export class LocalStorageSettings {
    private prefix: string;
    private app: App;
    constructor(private readonly plugin: ObsidianGit) {
        this.prefix = this.plugin.manifest.id + ":";
        this.app = plugin.app;
    }

    migrate(): void {
        const keys = [
            "password",
            "hostname",
            "conflict",
            "lastAutoPull",
            "lastAutoBackup",
            "lastAutoPush",
            "gitPath",
            "pluginDisabled",
        ];
        for (const key of keys) {
            const old = localStorage.getItem(this.prefix + key);
            if (
                this.app.loadLocalStorage(this.prefix + key) == null &&
                old != null
            ) {
                if (old != null) {
                    this.app.saveLocalStorage(this.prefix + key, old);
                    localStorage.removeItem(this.prefix + key);
                }
            }
        }
        // Stash any existing plaintext password under a temp key so the async
        // migrateCredentialsToKeychain() can move it to the OS keychain, then
        // wipe it from the normal storage slot right away.
        const existingPassword = this.app.loadLocalStorage(
            this.prefix + "password"
        ) as string | null;
        if (existingPassword != null && Platform.isDesktopApp) {
            this.app.saveLocalStorage(
                this.prefix + "legacyPassword",
                existingPassword
            );
        }
        this.app.saveLocalStorage(this.prefix + "password", null);
        localStorage.removeItem(this.prefix + "PATHPaths");
    }

    /** Moves any legacy plaintext password from localStorage to the OS keychain (desktop only). */
    async migrateCredentialsToKeychain(): Promise<void> {
        if (!Platform.isDesktopApp) return;
        const legacy = this.app.loadLocalStorage(
            this.prefix + "legacyPassword"
        ) as string | null;
        if (!legacy) return;
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const keytar = require("keytar") as typeof import("keytar");
            await keytar.setPassword("obsidian-git", "default", legacy);
        } catch {
            // keytar unavailable — credential will be prompted on next auth
        }
        this.app.saveLocalStorage(this.prefix + "legacyPassword", null);
    }

    getPassword(): string | null {
        if (!Platform.isDesktopApp) {
            return _mobilePassword;
        }
        // Desktop: password is managed via the OS keychain in isomorphicGit.ts.
        // Return null here; callers that need the raw value use the keychain directly.
        return null;
    }

    setPassword(value: string): void {
        if (!Platform.isDesktopApp) {
            _mobilePassword = value;
            // Never persist to localStorage on mobile
            return;
        }
        // Desktop: password is stored in OS keychain — do not write to localStorage.
    }

    getUsername(): string | null {
        if (!Platform.isDesktopApp) {
            return _mobileUsername;
        }
        return this.app.loadLocalStorage(this.prefix + "username") as
            | string
            | null;
    }

    setUsername(value: string): void {
        if (!Platform.isDesktopApp) {
            _mobileUsername = value;
            return;
        }
        return this.app.saveLocalStorage(this.prefix + "username", value);
    }

    /** Clears session-scoped in-memory credentials (mobile). */
    clearSessionCredentials(): void {
        _mobilePassword = null;
        _mobileUsername = null;
    }

    getHostname(): string | null {
        return this.app.loadLocalStorage(this.prefix + "hostname") as
            | string
            | null;
    }

    setHostname(value: string): void {
        return this.app.saveLocalStorage(this.prefix + "hostname", value);
    }

    getConflict(): boolean {
        return this.app.loadLocalStorage(this.prefix + "conflict") == "true";
    }

    setConflict(value: boolean): void {
        return this.app.saveLocalStorage(this.prefix + "conflict", `${value}`);
    }

    getLastAutoPull(): string | null {
        return this.app.loadLocalStorage(this.prefix + "lastAutoPull") as
            | string
            | null;
    }

    setLastAutoPull(value: string): void {
        return this.app.saveLocalStorage(this.prefix + "lastAutoPull", value);
    }

    getLastAutoBackup(): string | null {
        return this.app.loadLocalStorage(this.prefix + "lastAutoBackup") as
            | string
            | null;
    }

    setLastAutoBackup(value: string): void {
        return this.app.saveLocalStorage(this.prefix + "lastAutoBackup", value);
    }

    getLastAutoPush(): string | null {
        return this.app.loadLocalStorage(this.prefix + "lastAutoPush") as
            | string
            | null;
    }

    setLastAutoPush(value: string): void {
        return this.app.saveLocalStorage(this.prefix + "lastAutoPush", value);
    }

    getGitPath(): string | null {
        return this.app.loadLocalStorage(this.prefix + "gitPath") as
            | string
            | null;
    }

    setGitPath(value: string): void {
        return this.app.saveLocalStorage(this.prefix + "gitPath", value);
    }

    getPATHPaths(): string[] {
        return (
            (
                this.app.loadLocalStorage(this.prefix + "PATHPaths") as
                    | string
                    | null
            )?.split(":") ?? []
        );
    }

    setPATHPaths(value: string[]): void {
        return this.app.saveLocalStorage(
            this.prefix + "PATHPaths",
            value.join(":")
        );
    }

    getEnvVars(): string[] {
        return JSON.parse(
            (this.app.loadLocalStorage(this.prefix + "envVars") as
                | string
                | undefined) ?? "[]"
        ) as string[];
    }

    setEnvVars(value: string[]): void {
        return this.app.saveLocalStorage(
            this.prefix + "envVars",
            JSON.stringify(value)
        );
    }

    getPluginDisabled(): boolean {
        return (
            this.app.loadLocalStorage(this.prefix + "pluginDisabled") == "true"
        );
    }

    setPluginDisabled(value: boolean): void {
        return this.app.saveLocalStorage(
            this.prefix + "pluginDisabled",
            `${value}`
        );
    }

    /**
     * Whether automatic routines are currently paused.
     * New timers should not be started when this is true.
     */
    getPausedAutomatics(): boolean {
        return (
            this.app.loadLocalStorage(this.prefix + "pausedAutomatics") ==
            "true"
        );
    }

    setPausedAutomatics(value: boolean): void {
        return this.app.saveLocalStorage(
            this.prefix + "pausedAutomatics",
            `${value}`
        );
    }

    /**
     * The length of the fallback spacing for the line authoring gutter, which
     * is used when the longest rendered gutter is not yet known.
     */
    getGutterSpacingFallbackLength(): number {
        return (
            (this.app.loadLocalStorage(
                this.prefix + "gutterSpacingFallbackLength"
            ) as number) ?? 5
        );
    }

    setGutterSpacingFallbackLength(value: number): void {
        return this.app.saveLocalStorage(
            this.prefix + "gutterSpacingFallbackLength",
            value
        );
    }
}
