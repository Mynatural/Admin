
export type Lineup = {
    name: string,
    price: number,
    specs: Spec[],
    specValues: SpecValue[],
    measurements: Measurement[]
}

export type Spec = {
    name: string,
    key: string,
    sides: SpecSide,
    canSame?: string, // key of other Spec
    value: {
        initial: string,
        availables: string[] // keys of SpecValue
    }
}

export type SpecSide = "FRONT" | "BACK";

export type SpecValue = {
    name: string,
    key: string,
    description: string,
    options: SpecOption[],
    price: number
}

export type SpecOption = {
    name: string,
    key: string,
    value: {
        initial: string,
        availables: SpecOptionValue[]
    }
}

export type SpecOptionValue = {
    name: string,
    key: string,
    description?: string
}

export type Measurement = {
    name: string,
    key: string,
    value: {
        initial: number,
        min: number,
        max: number,
        step: number
    }
}
