import { HeroRole } from '../analyzers/types';

export class ReplayAttributeHelper {

    public constructor(private replayAttributeEvents: any) { }

    public get(scope: number, key: number) {
        return this.replayAttributeEvents.scopes[scope][key][0].value;
    }

    public get pickOrder(): string {
        return this.get(16, 4018);
    }

    // TODO: verify
    public get gameSpeed(): string {
        return this.get(16, 3000);
    }

    public get gamePrivate(): boolean {
        return this.get(16, 3009) === 'Priv';
    }

    public get draftMode(): string {
        return this.get(16, 4010);
    }

    public get banType(): string {
        return this.get(16, 4021);
    }

    public get bannerChooseMethod(): string {
        return this.get(16, 4022);
    }

    public getBanPlayerSlot(team: number) {
        const value = this.get(16, team === 0 ? 4022 : 4027).trim();
        return value === 'Hmmr' ? -1 : parseInt(value, 10);
    }

    public getBanWasLocked(team: number, ban: number): boolean {
        let key: number;
        if (team === 0) {
            key = ban ? 4024 : 4026;
        } else {
            key = ban ? 4029 : 4031;
        }
        return this.get(16, key) === 'yes';
    }

    public getBan(team: number, ban: number): string {
        let key: number;
        if (team === 0) {
            key = ban ? 4023 : 4025;
        } else {
            key = ban ? 4028 : 4030;
        }
        return this.get(16, key);
    }

    public getWasBanned(team: number, ban: number): boolean {
        const banned = this.getBan(team, ban);
        if (!banned) {
            return false;
        }
        return !!(banned.trim());
    }

    public getPlayerRole(playerIndex: number): HeroRole {
        return this.get(playerIndex + 1, 4007);
    }


}