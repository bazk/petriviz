require.config({
    baseUrl: 'js',
    paths: {
        'jquery': 'vendor/jquery-1.10.2.min',
        'bootstrap': 'vendor/bootstrap.min',
        'd3': 'vendor/d3.v3.min',
    },
    shim : {
        "bootstrap" : { "deps" :['jquery'] }
    }
});

define('modernizr', [], Modernizr);

require(["petri", "jquery", "d3", "modernizr", "bootstrap"], function(PetriNetEditor, $, d3, Modernizr) {
    // Add the isArray method for all browsers
    if (typeof Array.isArray !== 'function') {
        Array.isArray = function (arr) {
            return Object.prototype.toString.call(arr) === '[object Array]';
        };
    }

    // Avoid `console` errors in browsers that lack a console.
    var method;
    var noop = function () {};
    var methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeStamp', 'trace', 'warn'
    ];
    var length = methods.length;
    var console = (window.console = window.console || {});

    while (length--) {
        method = methods[length];

        // Only stub undefined methods.
        if (!console[method]) {
            console[method] = noop;
        }
    }


    var container = d3.select("div.board-container");
    var tools = d3.select("div.tools");
    var editor = new PetriNetEditor(container, tools);

    function toggleFullScreen() {
        var doc = window.document;
        var docEl = doc.documentElement;

        var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
        var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

        if(!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
            requestFullScreen.call(docEl);
        }
        else {
            cancelFullScreen.call(doc);
        }
    }

    d3.select("#fs").on("click", function () {
        toggleFullScreen();
    });

    d3.select("#clear").on("click", function () {
        editor.clear();
    });
});