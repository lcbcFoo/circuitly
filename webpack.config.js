module.exports = {
    entry: "./src/client/index.ts",
    devtool: "source-map",
    target: "web",
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"]
            },
            {
                test: /\.scss$/,
                use: ["style-loader", "css-loader", "sass-loader"]
            },
            {
                test: /\.svg|\.png/,
                use: ["base64-inline-loader?limit=1000&name=[name].[ext]"]
            },
            {
                test: /\.js/,
                loader: "babel-loader",
                exclude: /node_modules/
            },
            {
                test: require.resolve("jquery"),
                use: [
                    {
                        loader: "expose-loader",
                        options: "$"
                    }
                ]
            },
            {
                test: /\.tsx?$/,
                use: [{
                    loader: 'ts-loader',
                }],
                exclude: /node_modules/
            },
        ]
    },
    resolve: {
        extensions: [ '.tsx', '.ts', '.js' ],
    },
    devServer: {
        host: '0.0.0.0',
        port: 80,
        proxy: {
            "/api": "http://0.0.0.0:8080"
        }
    }
};
