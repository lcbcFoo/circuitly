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

// Module: NOT
// Parameters:
// - BIT_LEN: bit-size of signals
// Connections
// - input a: param 0
// - output b: result of NOT(A)

// Wraps SV primitive to show inner blocks
module NOT #(
    parameter BIT_LEN = 1
) (
    input  [BIT_LEN - 1:0] a,
    output [BIT_LEN - 1:0] b,
);

    assign b = a ~& a;

endmodule
