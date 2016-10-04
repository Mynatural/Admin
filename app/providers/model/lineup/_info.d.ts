
export type Item = {
    name: string,
    price: number,
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
        initial: string,
        availables: string[] // keys of Spec
    }
}

export type SpecSide = "FRONT" | "BACK";

export type Spec = {
    name: string,
    key: string,
    description: string,
    derives: DerivGroup[],
    price: number
}

export type DerivGroup = {
    name: string,
    key: string,
    value: {
        initial: string,
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
    value: {
        initial: number,
        min: number,
        max: number,
        step: number
    }
}
