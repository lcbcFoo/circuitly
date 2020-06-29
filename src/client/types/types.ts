// Device object return by yosys2digitaljs
export class Device {
    public celltype: string;
    public bits: number;
    public label: string;
    public nets: string;
}

// Represents an IO Device in UI circuit generated by digitaljs
export class IODevice {
    public label: string;
    public net: string;
    public bits: number;
    public element: HTMLElement;
    public typeofelement: string;
    public ioType: string;
}

export class NameVal {
    public name: string;
    public val: number | string | boolean;
}

export class NameOnly {
    public name: string;
}

export class TestbenchOutputResult {
    public success: boolean;
    public failDescription: string;
    public failLine: number;
    public signalName: string;
    public value: string;
}

export class TestbenchRow {
    public inputs: NameVal[];
    public tbResults: TestbenchOutputResult[];
}