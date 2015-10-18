/*
 Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 Based on Underscore.js, copyright 2009-2015 Jeremy Ashkenas,
 DocumentCloud and Investigative Reporters & Editors <http://underscorejs.org/>

 Permission is hereby granted, free of charge, to any person obtaining
 a copy of this software and associated documentation files (the
 "Software"), to deal in the Software without restriction, including
 without limitation the rights to use, copy, modify, merge, publish,
 distribute, sublicense, and/or sell copies of the Software, and to
 permit persons to whom the Software is furnished to do so, subject to
 the following conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

export interface Action<T>
{
    (item: T): void;
}

export interface Func<T,TResult>
{
    (item: T): TResult;
}

export function _pairs(obj: Object) {
    var result = [];
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            result.push([key, obj[key]]);
        }
    }
    return result;
}

export function _some(items: Array<any>, check: Func<any, boolean>) {
    var result = items.reduce(function(agg, current) {
        return agg || check(current);
    }, false);
    return result;
}


function isRegExp(value) {
    return Object.prototype.toString.call(value) === '[object RegExp]';
}
function isDate(value) {
    return Object.prototype.toString.call(value) === '[object Date]';
}
function isFunction(value) {
    return Object.prototype.toString.call(value) === '[object Function]';
}
function isArray(value) {
    return Object.prototype.toString.call(value) === '[object Array]';
}

export function _isEqual(o1:any, o2:any) {
    if (o1 === o2) return true;
    if (o1 === null || o2 === null) return false;
    if (o1 !== o1 && o2 !== o2) return true; // NaN === NaN
    var t1 = typeof o1, t2 = typeof o2, length, key, keySet;
    if (t1 == t2) {
        if (t1 == 'object') {
            if (isArray(o1)) {
                if (!isArray(o2)) return false;
                if ((length = o1.length) == o2.length) {
                    for (key = 0; key < length; key++) {
                        if (!_isEqual(o1[key], o2[key])) return false;
                    }
                    return true;
                }
            } else if (isDate(o1)) {
                if (!isDate(o2)) return false;
                return _isEqual(o1.getTime(), o2.getTime());
            } else if (isRegExp(o1)) {
                return isRegExp(o2) ? o1.toString() == o2.toString() : false;
            } else {
                if (isArray(o2) || isDate(o2) || isRegExp(o2)) return false;
                keySet = {};
                for (key in o1) {
                    if (key.charAt(0) === '$' || isFunction(o1[key])) continue;
                    if (!_isEqual(o1[key], o2[key])) return false;
                    keySet[key] = true;
                }
                for (key in o2) {
                    if (!keySet.hasOwnProperty(key) &&
                        key.charAt(0) !== '$' &&
                        o2[key] === undefined &&
                        !isFunction(o2[key])) return false;
                }
                return true;
            }
        }
    }
    return false;
};
