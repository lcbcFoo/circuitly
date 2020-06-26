export declare class Device {
    celltype: string;
    bits: number;
    label: string;
    nets: string;
}
export declare class IODevice {
    label: string;
    net: string;
    bits: number;
    element: HTMLElement;
    typeofelement: string;
    ioType: string;
}
export declare class NameVal {
    name: string;
    val: number | string | boolean;
}
export declare class NameOnly {
    name: string;
}
export declare class TestbenchOutputResult {
    success: boolean;
    failDescription: string;
    failLine: number;
    signalName: string;
    value: string;
}
export declare class TestbenchRow {
    inputs: NameVal[];
    tbResults: TestbenchOutputResult[];
}
