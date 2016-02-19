# alpaca-sm

>针对sm公司业务定制的用于模块化解析的工具。
>因公司前端业务框架的原因，前端开发不能使用市面上的模块化类库，如seajs,requireJs,modJs等。
此工具是在编译阶段，将采用commonJS规范的模块化代码，转译成闭包形式的代码。

## USAGE

### 安装

```bash
npm install alpaca-sm -g
```

### API说明

####config
+ 解释：管理配置项
+ 用法：
    ```js
    alp.config.get('ns');
    alp.config.get('readable.css');
    alp.config.set('ns');
    ```

####processor
+ 解释：分析文件的依赖项
+ 参数：
    src: 文件的绝对路径，重要的事说三遍，绝对路径！绝对路径！绝对路径！
    contentProcessor: 文件内容处理器，返回处理过后的文件内容。
+ 用法：
    ```js
        alp.processor({
            src: file.realpath,
            contentProcessor: function (file) {
                var retObj;

                retObj = ret.src['/' + file.subpath];
                if (retObj) {
                    return retObj.rawContent || retObj.getContent();
                } else {
                    return file.getContent();
                }
            }
        });

    ```

### 配置说明

####ns
    解释：生成闭包后，所使用的命名空间
    类型: string
    默认值：'ns'
####root
    解释：项目的根目录
    类型：string
    默认值：当前目录
    说明：注意配置项fileBasedRoot对他的影响
####fileBasedRoot
    解释：js文件中使用require的路径是否是基于root的。
    类型：boolean
    默认值：false
    说明：主要用于应对使用构建工具生成的文件，路径会被编译为基于项目root的相对路径，如fis
####exclude
    解释：排除一些已存在的使用require关键字的文件，比如用webpack或browerify打包的文件。
    类型：array | string | RegExp
    默认值：[]
####isOptimizer
    解释：分析的文件是否是被压缩过的文件
    类型：boolean
    默认值：false
    说明：压缩过的文件和没压缩过的文件，代码结构不同，不能使用同一种处理方法。
####wrapJsInHtml
    解释：是否对html中的js代码添加闭包代码
    类型：boolean
    默认值：false
    说明：如果代码中的require参与运算的话，就忽略该值，为代码加上闭包。
####readable.css
    解释：在js中出现requrie('../xx.css')时，是否读取css文件的内容
    类型：boolean
    默认值：false
####readable.cssInHtml
    解释：在HTML文件的script标签使用require('../xx.css')是，是否读取css的内容
    类型：boolean
    默认值：false
####tmpl
    解释：css和js的引入模板





