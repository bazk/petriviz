

document.onload = (function(Modernizr, $, d3, localStorage) {
    "use strict";

    var KEY_A = 65,
        KEY_P = 80,
        KEY_T = 84,
        KEY_ESC = 27;

    // var net = [
    //     { id: 0, type: "place", x: 50,    y: 50  },
    //     { id: 1, type: "place", x: -50,   y: -50 },
    //     { id: 2, type: "place", x: -50,   y: 50  },
    //     { id: 3, type: "place", x: 50,    y: -50 },
    //     { id: 4, type: "transition", x: 30,    y: 10  },
    //     { id: 5, type: "transition", x: -10,   y: -80 },
    //     { id: 6, type: "arc", source: 0, target: 4 },
    //     { id: 7, type: "arc", source: 4, target: 1 }
    // ]

    var net = [];

    if (Modernizr.localstorage) {
        try {
            net = JSON.parse(localStorage.getItem("net"));

            if (typeof net !== "object")
                throw "not a list";

            for (var i=0; i<net.length; i++) {
                if (typeof net[i] !== "object")
                    throw "item is not an object";
                if ((typeof net[i].id === 'undefined') ||
                    (typeof net[i].type === 'undefined'))
                    throw "missing id or type";
            }
        }
        catch (e) {
            console.error('Failed to read net from local storage!', e);
            net = [];
        }
    }

    var PetriNetEditor = function(outerContainer) {
        var self = this;

        self.outerContainer = outerContainer;
        self.svg = self.outerContainer.append("svg");

        d3.select(window).on('resize', function () {
            self.onResize(this);
        });
        self.onResize();

        d3.select(window).on('keydown', function () {
                self.onKeyDown(this);
            }).on("keyup", function () {
                self.onKeyUp(this);
            });

        self.svg.on("mousedown", function () {
                self.onMouseDown(this);
            })
            .on("mouseup", function () {
                self.onMouseUp(this);
            })
            .on("mouseover", function () {
                self.onMouseOver(this);
            })
            .on("mousemove", function () {
                self.onMouseMove(this);
            })
            .on("mouseout", function () {
                self.onMouseOut(this);
            })
            .on("click", function () {
                self.onMouseClick(this);
            })
            .on("contextmenu", function () {
                self.onContextMenu(this);
            });

        // background
        self.svg.append("rect")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("fill", "#ededed");

        var defs = self.svg.append('svg:defs');
        defs.append('svg:marker')
            .attr('id', 'end-arrow')
            .classed('arc-arrow', true)
            .attr('viewBox', '-10 -5 13 10')
            .attr('refX', "0")
            .attr('markerWidth', 5)
            .attr('markerHeight', 5)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M-10,-5L3,0L-10,5');

        self.container = self.svg.append("g");

        self.places = self.container.append("g").selectAll("g");
        self.transitions = self.container.append("g").selectAll("g");
        self.arcs = self.container.append("g").selectAll("g");

        self.brush = self.svg.append("g");

        self.zoom = d3.behavior.zoom()
            .scaleExtent([0.1, 10])
            .translate([self.width / 2, self.height / 2])
            .on("zoom", function () { self.onZoom(this); });

        self.svg.call(self.zoom);

        self.drag = d3.behavior.drag()
            .origin(function(d) { return d; })
            .on("dragstart", function (d) { self.onDragStart(this, d); })
            .on("drag", function (d) { self.onDrag(this, d); })
            .on("dragend", function (d) { self.onDragEnd(this, d); });

        self.container.attr("transform", "translate(" + self.width / 2 + ", " + self.height / 2 + ")");

        self.contextMenu = self.outerContainer.append("ul")
            .classed("dropdown-menu", true);

        self.draw();
    }

    PetriNetEditor.prototype.draw = function () {
        var self = this;

        /* ARCS */
        this.arcs = this.arcs.data(net.filter(function (d) { return d.type === 'arc'; }));

        this.arcs.enter()
            .append("path")
            .filter(function (d) { return d.type === 'arc'; });

        this.arcs.exit()
            .remove();

        this.arcs
            .style('marker-end', 'url(#end-arrow)')
            .classed("arc", true)
            .attr("d", function (d) {
                var src, tgt;

                var source = net[d.source],
                    target = net[d.target];

                src = {
                    x: source.x,
                    y: source.y
                };
                tgt = {
                    x: target.x,
                    y: target.y
                };

                if (source.type === 'place') {
                    var adj = (tgt.x - src.x);
                    var opp = (tgt.y - src.y);
                    var hip = Math.sqrt(adj*adj + opp*opp);
                    var s = opp / hip;
                    var c = adj / hip;

                    src.x += c * 15;
                    src.y += s * 15;
                }
                else if (source.type === 'transition') {
                    var adj = (tgt.x - src.x);
                    var opp = (tgt.y - src.y);

                    if (Math.abs(opp) > Math.abs(adj))
                        if (opp > 0)
                            src.y += 12;
                        else
                            src.y -= 12;
                    else
                        if (adj > 0)
                            src.x += 12;
                        else
                            src.x -= 12;
                }

                if (target.type === 'place') {
                    var adj = (tgt.x - src.x);
                    var opp = (tgt.y - src.y);
                    var hip = Math.sqrt(adj*adj + opp*opp);
                    var s = opp / hip;
                    var c = adj / hip;

                    tgt.x -= c * 16;
                    tgt.y -= s * 16;
                }
                else if (target.type === 'transition') {
                    var adj = (tgt.x - src.x);
                    var opp = (tgt.y - src.y);

                    if (Math.abs(opp) > Math.abs(adj))
                        if (opp < 0)
                            tgt.y += 13;
                        else
                            tgt.y -= 13;
                    else
                        if (adj < 0)
                            tgt.x += 13;
                        else
                            tgt.x -= 13;
                }

                return "M" + src.x + "," + src.y + "L" + tgt.x + "," + tgt.y;
            });


        /* PLACES */
        this.places = this.places.data(net.filter(function (d) { return d.type === 'place'; }));

        this.places.enter()
            .append("circle")
            .on("mouseover", function (d) {
                self.onMouseOverObject(this, d);
            })
            .on("mouseout", function (d) {
                self.onMouseOutObject(this, d);
            })
            .on("click", function (d) {
                self.onMouseClickObject(this, d);
            })
            .on("contextmenu", function (d) {
                self.onContextMenuObject(this, d);
            })
            // .call(this.drag);

        this.places.exit()
            .remove();

        this.places
            .classed("place", true)
            .attr("cx", function (d) { return d.x; })
            .attr("cy", function (d) { return d.y; })
            .attr("r", 15);


        /* TRANSITIONS */
        this.transitions = this.transitions.data(net.filter(function (d) { return d.type === 'transition'; }));

        this.transitions.enter()
            .append("rect")
            .on("mouseover", function (d) {
                self.onMouseOverObject(this, d);
            })
            .on("mouseout", function (d) {
                self.onMouseOutObject(this, d);
            })
            .on("click", function (d) {
                self.onMouseClickObject(this, d);
            })
            .on("contextmenu", function (d) {
                self.onContextMenuObject(this, d);
            })
            // .call(this.drag);

        this.transitions.exit()
            .remove();

        this.transitions
            .classed("transition", true)
            .attr("x", function (d) { return d.x - 12; })
            .attr("y", function (d) { return d.y - 12; })
            .attr("width", 24)
            .attr("height", 24);
    }

    PetriNetEditor.prototype.onResize = function () {
        this.width = parseInt(this.outerContainer.style("width"));
        this.height = parseInt(this.outerContainer.style("height"));

        this.svg
            .style("width", this.width)
            .style("height", this.height);
    }

    PetriNetEditor.prototype.onZoom = function () {
        this.mouseDown = false;

        this.hideContextMenu();

        this.container
            .attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
    }

    PetriNetEditor.prototype.onDragStart = function (elem, d) {
        d3.event.sourceEvent.stopPropagation();

        d3.select(elem).classed("dragging", true);
    }

    PetriNetEditor.prototype.onDrag = function (elem, d) {
        this.hideContextMenu();

        d.x = d3.event.x;
        d.y = d3.event.y;
        this.draw();
    }

    PetriNetEditor.prototype.onDragEnd = function (elem, d) {
        var self = this;

        d3.select(elem).classed("dragging", false);
        self.queueSave();
    }

    PetriNetEditor.prototype.onKeyDown = function () {
    }

    PetriNetEditor.prototype.onKeyUp = function () {
        switch(d3.event.keyCode) {
        case KEY_ESC:
            this.hideContextMenu();
            break;
        }
    }

    PetriNetEditor.prototype.onMouseDown = function () {
    }

    PetriNetEditor.prototype.onMouseUp = function () {
    }

    PetriNetEditor.prototype.onMouseOver = function () {
    }

    PetriNetEditor.prototype.onMouseMove = function () {
        var self = this;

        self.newArcMove();
    }

    PetriNetEditor.prototype.onMouseOut = function () {
    }

    PetriNetEditor.prototype.onMouseClick = function (elem) {
        var self = this;

        if (self.selectedObject) {
            self.selectedObject.elem.classed('selected', false);
            self.selectedObject = undefined;
        }

        self.hideContextMenu();

        self.newArcEnd();
    }

    PetriNetEditor.prototype.onMouseOverObject = function (elem, d) {
        var self = this;

        self.newArcOver(elem, d);
    }

    PetriNetEditor.prototype.onMouseOutObject = function (elem, d) {
        var self = this;

        self.newArcOut(elem, d);
    }

    PetriNetEditor.prototype.onMouseClickObject = function (elem, d) {
        var self = this;

        d3.event.stopPropagation();

        if (self.selectedObject) {
            self.selectedObject.elem.classed('selected', false);
        }
        self.selectedObject = {
            elem: d3.select(elem),
            data: d
        };
        self.selectedObject.elem.classed('selected', true);

        self.newArcEnd(elem, d);
    }

    PetriNetEditor.prototype.onContextMenu = function (elem) {
        d3.event.preventDefault();

        var self = this;

        var xycoord = d3.mouse(self.container.node());

        var items = [
            {
                text: 'Add Place',
                action: function () {
                    net.push({
                        id: net.length,
                        type: "place",
                        x: xycoord[0],
                        y: xycoord[1]
                    });

                    self.queueSave();
                    self.draw();
                    self.hideContextMenu();
                }
            },
            {
                text: 'Add Transition',
                action: function () {
                    net.push({
                        id: net.length,
                        type: "transition",
                        x: xycoord[0],
                        y: xycoord[1]
                    });

                    self.queueSave();
                    self.draw();
                    self.hideContextMenu();
                }
            }
        ];

        self.showContextMenu(items, d3.event.offsetX, d3.event.offsetY);
    }

    PetriNetEditor.prototype.onContextMenuObject = function (elem, d) {
        d3.event.preventDefault();
        d3.event.stopPropagation();

        var self = this;

        var xycoord = d3.mouse(self.container.node());

        var items = [
            {
                text: 'Add Arc',
                action: function () {
                    self.newArcStart(elem, d);
                    self.hideContextMenu();
                }
            }
        ];

        self.showContextMenu(items, d3.event.offsetX, d3.event.offsetY);
    }

    PetriNetEditor.prototype.showContextMenu = function (items, x, y) {
        var self = this;

        self.contextMenu.selectAll("*").remove();

        var contextMenu = self.contextMenu.selectAll("p")
            .data(items);

        contextMenu.enter()
            .append("li")
            .append("a")
            .attr("href", "")
            .on("click", function (d) {
                if (typeof d.action === 'function') {
                    d3.event.preventDefault();
                    d.action(this);
                }
            })
            .text(function (d) { return d.text; });

        contextMenu.exit()
            .remove();

        self.contextMenu
            .style("display", "block")
            .style("top", y + 'px')
            .style("left", x + 'px');
    }

    PetriNetEditor.prototype.hideContextMenu = function () {
        var self = this;

        self.contextMenu.style("display", "none");
    }

    PetriNetEditor.prototype.newArcStart = function (elem, d) {
        var self = this;

        self.newArc = {};

        self.newArc.src = {
            elem: d3.select(elem),
            data: d
        };

        self.newArc.path = self.container.append("path")
            .style('marker-end', 'url(#end-arrow)')
            .classed("arc", true);

        self.newArc.src.elem.classed("dragging", true);
    }

    PetriNetEditor.prototype.newArcMove = function () {
        var self = this;

        if (!self.newArc)
            return;

        var xycoords = d3.mouse(this.container.node());

        var src = {
            x: self.newArc.src.data.x,
            y: self.newArc.src.data.y
        }
        var tgt = {
            x: xycoords[0],
            y: xycoords[1]
        }

        var adj = (tgt.x - src.x);
        var opp = (tgt.y - src.y);
        var hip = Math.sqrt(adj*adj + opp*opp);
        var s = opp / hip;
        var c = adj / hip;

        tgt.x -= c * 5;
        tgt.y -= s * 5;

        self.newArc.path
            .attr("d", "M" + src.x + "," + src.y + "L" + tgt.x + "," + tgt.y);
    }

    PetriNetEditor.prototype.newArcEnd = function (elem, d) {
        var self = this;

        if (!self.newArc)
            return;

        if (typeof d !== 'undefined') {
            self.newArc.target = {
                elem: d3.select(elem),
                data: d
            };

            var source = self.newArc.src,
                target = self.newArc.target;

            if ((source.data != target.data) &&
                (source.data.type != target.data.type)) {

                var exists = false;
                for (var i=0; i<net.length; i++) {
                    if (net[i].type !== 'arc')
                        continue;

                    if ((net[i].source == source.data.id) &&
                        (net[i].target == target.data.id)) {
                        exists = true;
                        break;
                    }
                }

                if (!exists) {
                    net.push({
                        id: net.length,
                        type: "arc",
                        source: source.data.id,
                        target: target.data.id
                    });

                    self.queueSave();
                    self.draw();
                }
            }
        }

        if (self.newArc.target)
            self.newArc.target.elem.classed('dragging', false);
        if (self.newArc.src)
            self.newArc.src.elem.classed('dragging', false);
        self.newArc.path.remove();
        self.newArc = undefined;
    }

    PetriNetEditor.prototype.newArcOver = function (elem, d) {
        var self = this;

        if (!self.newArc)
            return;

        if (self.newArc.src.data == d)
            return;

        if (self.newArc.src.data.type !== d.type) {
            self.newArc.target = {
                elem: d3.select(elem),
                data: d
            };
            self.newArc.target.elem.classed("dragging", true);
        }
    }

    PetriNetEditor.prototype.newArcOut = function (elem, d) {
        var self = this;

        if ((!self.newArc) || (!self.newArc.target))
            return;

        if (self.newArc.target.data == d) {
            self.newArc.target.elem.classed("dragging", false);
            self.newArc.target = undefined;
        }
    }

    PetriNetEditor.prototype.queueSave = function () {
        if (!Modernizr.localstorage)
            return;

        if (self.saveTimeout)
            clearTimeout(self.saveTimeout);

        self.saveTimeout = setTimeout(function () {
            localStorage.setItem("net", JSON.stringify(net));
        }, 1000);
    }


    var container = d3.select("div.board-container");
    var editor = new PetriNetEditor(container);

})(window.Modernizr, window.jQuery, window.d3, window.localStorage);