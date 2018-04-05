export interface IReplayColor {
    readonly m_a: number;
    readonly m_r: number;
    readonly m_g: number;
    readonly m_b: number;
}

export interface IReplayFile {
    readonly m_file: string;
}

export interface IReplayDataObject {
    readonly m_data: string;
}


export interface IAbility {
    readonly m_abilCmdIndex: number;
    readonly m_abilLink: number;
    readonly m_buttonLink: number;
}