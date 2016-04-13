var storage = alp.storage;

function getADeps(key, map, end) {
    var file = storage[key],
        requires = file.requires;

    map = map || [];

    for (var ci, len = requires.length, i = len - 1; ci = requires[i], i >= 0; i--) {
        if (storage[ci] && storage[ci].requiresObj && storage[ci].existsRequire(key)) {
            alp.log.error('文件[' + key + ']和文件[' + ci + ']循环引用');
        }

        map.unshift(ci);
        getADeps(ci, map, i);
    }

    for (var j = 0, ko = {}, cj; cj = map[j]; j++) {
        if (cj in ko) {
            map.splice(j, 1);
        } else {
            ko[cj] = true;
        }
    }

    return map;
}
function equalFile(file, cacheFile) {
    if (cacheFile && file && file.mtime === cacheFile.mtime) {
        if (cacheFile.md5) {
            if (file.md5 == cacheFile.md5) {
                return true;
            }
        } else {
            return true;
        }
    }

    return false;
}
module.exports = {
    getADeps: getADeps,
    equalFile: equalFile
};
