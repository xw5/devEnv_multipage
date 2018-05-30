var gulp = require("gulp");
var uglify = require("gulp-uglify");
var gp = require("gulp-load-plugins")();
var runSequence = require("run-sequence");
var browserSync = require('browser-sync').create();
var proxyMiddleware = require("http-proxy-middleware");

//webpack相关配置
var named = require('vinyl-named');
var webpack = require('webpack-stream');
var webpackConfig = require('./webpack.config.js');

//开发环境编译的路径
var devUrl = 'dist/';
var publishUrl = 'publish/';
var cdnUrl = 'http://www.test.com/';
var changeUrl = {
  '\\./assets/': cdnUrl+'assets/',
  '\\./css/': cdnUrl+'css/',
  '\\./js/': cdnUrl+'js/'
};

//清除js
gulp.task("clean:js",function(){
  return gulp.src(devUrl+"js/*.js")
    .pipe(gp.clean())
});
//清除css
gulp.task("clean:css",function(){
  return gulp.src(devUrl+"css/*.css")
    .pipe(gp.clean())
});
//清除html
gulp.task("clean:html",function(){
  return gulp.src(devUrl+"*.html")
    .pipe(gp.clean())
});
//清除dist目录
gulp.task("clean:dist",function(){
  return gulp.src(devUrl)
    .pipe(gp.clean())
});
//清除publish目录
gulp.task("clean:publish",function(){
  return gulp.src(publishUrl)
    .pipe(gp.clean())
});

//错误处理
function showErr(error){
  console.error(error.toString());
  this.emit('end')
}

//开发环境编译scss任务,同时做兼容处理
gulp.task('sass',function(){
	return gulp.src("./src/sass/*.scss")
    .pipe(gp.debug({title:'scss解析:'}))
    .pipe(gp.sourcemaps.init())
		//sass解析
		.pipe(gp.sass({outputStyle: 'expanded'}).on("error",gp.sass.logError))
		//浏览器兼容前缀添加
		.pipe(gp.autoprefixer({
			browsers:["last 1000 versions"]
		}))
    .pipe(gp.sourcemaps.write('.'))
		.on('error',showErr)
		.pipe(gulp.dest(devUrl+"css"))
});

//静态等资源移动任务:图片、视频、字体等
gulp.task("assetsMove",function(){
	return gulp.src("./src/assets/**")
		.pipe(gp.changed(devUrl+"assets"))
		.pipe(gp.debug({title:'静态资源移动:'}))
		.on('error',showErr)
		.pipe(gulp.dest(devUrl+"assets"))
});

//通用js库插件移动
gulp.task("libMove",function(){
	return gulp.src(["src/js/lib/**"])
    .pipe(gp.changed(devUrl+"js/lib/"))
		.on('error',showErr)
		.pipe(gulp.dest(devUrl+"js/lib/"))
});

//html模板功能实现
gulp.task('include',function(){
	return gulp.src('src/*.html')
    .pipe(gp.debug({title:'html模板解析:'}))
		.pipe(gp.fileInclude({
      prefix: '@@',
      basepath: '@file'
    }))
		.on('error',showErr)
		.pipe(gulp.dest(devUrl))
});

//js模块化开发
gulp.task("webpack",function(){
	return gulp.src("./src/js/*.js")
    .pipe(gp.debug({title:'js打包:'}))
		.pipe(named())
		.pipe(webpack(webpackConfig))
		.on('error',showErr)
		.pipe(gulp.dest(devUrl+"js"))
});

//开启一个自动刷新的服务器,并对css,js,html等资源改变时做自动刷新,实现反向代理
var server = {
  baseDir:devUrl,
  middleware :[proxyMiddleware(['/api'], {target: 'http://localhost:8080', changeOrigin: true})]
};
gulp.task("server",function(){
	browserSync.init({
		files:[
			"dist/css/*.css",
			"dist/js/*.js",
			"dist/assets/**/*.*",
			"dist/*.html"
		],
		server:server
	})
});

//文件变化监听
gulp.task("watch",function(){
	gulp.watch("src/js/**/*.js",function(){
		runSequence("clean:js","webpack");
	});
	gulp.watch("src/assets/**/*.*",["assetsMove"]);
	gulp.watch("src/sass/**/*.*",function(){
    runSequence("clean:css","sass");
	});
	gulp.watch(["src/*.html","src/template/*.*"],function(){
    runSequence("clean:html","include");
	});
});

//发布到publish
	//静态等资源移动任务:图片、视频、字体等
	gulp.task("assetsMovePublish",function(){
		return gulp.src(devUrl+"assets/**/*.*")
			.pipe(gp.debug({title:'静态资源(图片，字体，视频，音乐等)移动:'}))
			.pipe(gulp.dest(publishUrl+"assets"))
	});
	//通用js库插件移动
	gulp.task("libMovePublish",function(){
		return gulp.src(devUrl+"js/lib/**/*.*")
      .pipe(gp.debug({title:'js库移动:'}))
			.pipe(gulp.dest(publishUrl+"js/lib/"))
	});
	//html资源路径走CDN,只有当cdnUrl不为空的时候才走替换路径
	gulp.task("change-paths", function(){
		return gulp.src([devUrl+"*.html"])
      .pipe(gp.debug({title:'html路径替换CDN:'}))
			.pipe(gp.if(cdnUrl != '', gp.urlReplace(changeUrl)))
			//.pipe(gp.urlReplace(changeUrl))
			.pipe(gulp.dest(publishUrl));
	});
	//js压缩
	gulp.task("jsMin",function(){
		return gulp.src(devUrl+"js/*.js")
      .pipe(gp.debug({title:'js压缩:'}))
			.pipe(gp.uglify({
				ie8:true
			}))
			.pipe(gulp.dest(publishUrl+"js/"))
	});
	//css压缩
	gulp.task("cssMin",function(){
		return gulp.src(devUrl+"css/*.css")
      .pipe(gp.debug({title:'css压缩:'}))
			.pipe(gp.cleanCss({compatibility: 'ie8'}))
			.pipe(gulp.dest(publishUrl+"css/"))
	});

//开发构建
gulp.task('dev',function(){
  runSequence("clean:dist",["sass","libMove","webpack","assetsMove","include"],"server","watch");
});

//发布构建
gulp.task('build',function(){
  runSequence("clean:publish",["assetsMovePublish","libMovePublish","change-paths","jsMin","cssMin"]);
});