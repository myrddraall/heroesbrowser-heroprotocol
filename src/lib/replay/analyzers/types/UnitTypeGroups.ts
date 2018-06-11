
export class UnitTypeGroup extends Array<string>{

    public constructor(unitTypeNames:string[]){
        super();
        Object.assign(this, unitTypeNames);
    }

    public matches(unitTypeName:string){
        return this.indexOf(unitTypeName) !== -1;
    }
}

export class UnitTypeGroups{
    public static CORE = new UnitTypeGroup(['KingsCore', 'VanndarStormpike', 'DrekThar']);
}