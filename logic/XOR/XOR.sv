// Copyright (C) 2020 Lucas Castro
// 
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the 
// "Software"), to deal in the Software without restriction, including 
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
// 
// - The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.

// Module: AND
// Parameters:
// - BIT_LEN: bit-size of signals
// Connections
// - input a: param 0
// - input b: param 1
// - output c: result of a AND b

// Wraps SV primitive to show inner blocks
module XOR #(
    parameter BIT_LEN = 1
) (
    input  [BIT_LEN - 1:0] a,
    input  [BIT_LEN - 1:0] b,
    output [BIT_LEN - 1:0] c,
);

    logic [BIT_LEN-1:0] nand_ab;
    logic [BIT_LEN-1:0] nand_ab_a;
    logic [BIT_LEN-1:0] nand_ab_b;

    assign nand_ab = a ~& b;
    assign nand_ab_a = nand_ab ~& a;
    assign nand_ab_b = nand_ab ~& b;
    assign c = nand_ab_a ~& nand_ab_b;

endmodule
