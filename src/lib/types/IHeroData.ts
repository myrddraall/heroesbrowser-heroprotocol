
export interface IHeroAbility {
    owner: string;
    name: string;
    title: string;
    description: string;
    icon: string;
    hotkey: string;
    cooldown: number;
    mana_cost: number;
    trait: boolean;
}

export interface IHeroTalent {
    name: string;
    title: string;
    description: string;
    icon: string;
    icon_url: { [size: string]: string };
    ability: string
    sort: number;
    cooldown: number;
    mana_cost: number;
    level: number;
}

export interface IHero {
    name: string;
    short_name: string;
    attribute_id: string;
    translations: string[];
    icon_url: { [size: string]: string };
    role: string;
    type: string;
    release_date: string;
    abilities: IHeroAbility[];
    talents: IHeroTalent[];
}

export interface IHeroData extends Array<IHero> { }