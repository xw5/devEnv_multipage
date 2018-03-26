// var webpack = require("webpack");
//webpack配件文件
module.exports={
    devtool:"source-map",
    module:{
        loaders:[]
    },
    resolve:{
        //自动识别后缀
        extensions:['.js']
    },
    plugins:[
      // new webpack.optimize.UglifyJsPlugin({
      //   compress:{
      //     warnings:false
      //   }
      // })
    ]
};