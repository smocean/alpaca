# alpaca-sm

针对sm公司业务定制的用于模块化解析的工具。

因公司前端业务框架的原因，前端开发不能使用市面上的模块化类库，如seajs,requireJs,modJs等。

此工具是在编译阶段，将采用commonJS规范的模块化代码，转译成闭包形式的代码。

## USAGE



### example

a-object.js
```js

module.exports = {
	sayName: function(name) {
		console.log(name);;;
		var tt = '6';
	}
}

```
b-function.js
```js
var aobj = require('./a-object.js');

module.exports = function(word) {
	aobj.sayName(word + 'test');
}

```
#### 命令行

```
alp release -d ./output

```

#### output

a-object.js

```
window.sm = window.sm || {};
(function (sm) {
	sm.a_object_js = {
        sayName: function (name) {
            console.log(name);;
            var tt = '6';
        }
    };
}(sm));
```
b-function.js
```js
window.sm = window.sm || {};
(function (sm, a_object_js) {
    var aobj = a_object_js;
    sm.b_function_js = function (word) {
        aobj.sayName(word + 'test');
    };
}(sm, sm.a_object_js));
```
### config说明






















