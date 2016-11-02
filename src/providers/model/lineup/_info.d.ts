
export type Item = {
    name: string,
    price: number,
    flags: {[key: string]: string},
    description: string,
    specGroups: SpecGroup[],
    specs: Spec[],
    measurements: Measurement[]
}

export type SpecGroup = {
    name: string,
    key: string,
    side: SpecSide,
    canSame?: string, // key of other Spec
    value: {
        availables: string[] // keys of Spec
    }
}

export type SpecSide = "FRONT" | "BACK";

export type Spec = {
    name: string,
    key: string,
    description: string,
    derivGroups: DerivGroup[],
    price: number
}

export type DerivGroup = {
    name: string,
    key: string,
    value: {
        availables: Deriv[]
    }
}

export type Deriv = {
    name: string,
    key: string,
    description: string
}

export type Measurement = {
    name: string,
    key: string,
    description: string,
    value: {
        initial: number,
        min: number,
        max: number,
        step: number
    }
}
