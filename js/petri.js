define(function (require) {
    var $ = require("jquery");
    var d3 = require("d3");

    var KEY_A = 65,
        KEY_P = 80,
        KEY_T = 84,
        KEY_ESC = 27;

    var PetriNetEditor = function(outerContainer, toolsContainer) {
        var self = this;

        self.net = self.loadFromLocalStorage() || { idSeq: 0, objects: [] };

        self.outerContainer = outerContainer;
        self.svg = self.outerContainer.append("svg");

        self.toolsContainer = toolsContainer;

        d3.select(window).on('resize', function () {
            self.onResize(this);
        });
        self.onResize();

        d3.select(window)
            .on("keyup", function () {
                self.onKeyUp(this);
            });

        self.svg.on("mousedown", function () {
                self.onMouseDown(this);
            })
            .on("mousemove", function () {
                self.onMouseMove(this);
            })
            .on("click", function () {
                self.onMouseClick(this);
            });

        // background
        self.svg.append("rect")
            .attr("width", "100%")
            .attr("height", "100%")
            .classed("background", true);

        // arcs arrows
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

        self.crosshair = self.container.append("g")
            .attr("class", "crosshair")
            .style("display", "none");

        // horizontal crosshair
        self.crosshair.append("line")
            .attr({
                "x1": -10,
                "y1": 0,
                "x2": 10,
                "y2": 0
            });

        // vertical crosshair
        self.crosshair.append("line")
            .attr({
                "x1": 0,
                "y1": -10,
                "x2": 0,
                "y2": 10
            });

        self.arcs = self.container.append("g").selectAll("g");
        self.places = self.container.append("g").selectAll("g");
        self.transitions = self.container.append("g").selectAll("g");

        self.zoom = d3.behavior.zoom()
            .scaleExtent([0.1, 10])
            .translate([self.width / 2, self.height / 2])
            .on("zoom", function () { self.onZoom(this); });

        // disable double click to zoom
        self.svg.call(self.zoom).on("dblclick.zoom", null);

        self.drag = d3.behavior.drag()
            .origin(function(d) { return d; })
            .on("dragstart", function (d) { self.onDragStart(this, d); })
            .on("drag", function (d) { self.onDrag(this, d); })
            .on("dragend", function (d) { self.onDragEnd(this, d); });

        // center the viewport
        self.container.attr("transform", "translate(" + self.width / 2 + ", " + self.height / 2 + ")");

        self.draw();
    }

    PetriNetEditor.prototype.loadFromLocalStorage = function () {
        var self = this;

        var tmp, net;

        if (!Modernizr.localstorage)
            return null;

        try {
            tmp = JSON.parse(localStorage.getItem("net"));

            if (typeof tmp !== "object")
                return null;

            if (Array.isArray(tmp)) {
                // convert from old format
                net = {
                    idSeq: tmp.length,
                    objects: tmp
                }
            }
            else {
                net = tmp
            }

            for (var i=0; i<net.objects.length; i++) {
                if (typeof net.objects[i] !== "object")
                    return null;

                if ((typeof net.objects[i].id === 'undefined') ||
                    (typeof net.objects[i].type === 'undefined'))
                    return null;
            }

            if (typeof net.idSeq === "undefined")
                net.idSeq = net.objects.length;
        }
        catch (e) {
            return null;
        }

        return net;
    }

    PetriNetEditor.prototype.queueSaveToLocalStorage = function () {
        var self = this;

        if (!Modernizr.localstorage)
            return;

        if (self.saveTimeout)
            clearTimeout(self.saveTimeout);

        self.saveTimeout = setTimeout(function () {
            localStorage.setItem("net", JSON.stringify(self.net));
        }, 1000);
    }

    PetriNetEditor.prototype.draw = function () {
        var self = this;

        function getArcPath(d) {
            var source, target;
            for (var i=0; i<self.net.objects.length; i++) {
                if (self.net.objects[i].id == d.source)
                    source = self.net.objects[i];

                if (self.net.objects[i].id == d.target)
                    target = self.net.objects[i];
            }

            if ((typeof source === "undefined") || (typeof target === "undefined")) {
                console.log("Missing source or target for arc "+d.id);
                return;
            }

            var src = {
                x: source.x,
                y: source.y
            };
            var tgt = {
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
        };

        /* ARCS */
        this.arcs = this.arcs.data(self.net.objects.filter(function (d) { return d.type === 'arc'; }));

        var arc = this.arcs.enter()
            .append("g")
            .classed("arc", true)
            .on("mousedown", function (d) {
                self.onMouseDownObject(this, d);
            })
            .on("mouseup", function (d) {
                self.onMouseUpObject(this, d);
            })
            .on("click", function (d) {
                self.onMouseClickObject(this, d);
            });

        arc.append("path")
            .classed("arc-radius", true);

        arc.append("path")
            .classed("arc-body", true)
            .style('marker-end', 'url(#end-arrow)');

        this.arcs.selectAll("path")
            .attr("d", getArcPath);

        this.arcs.exit()
            .remove();


        /* PLACES */
        this.places = this.places.data(self.net.objects.filter(function (d) { return d.type === 'place'; }));

        this.places.enter()
            .append("circle")
            .on("mouseover", function (d) {
                self.onMouseOverObject(this, d);
            })
            .on("mouseout", function (d) {
                self.onMouseOutObject(this, d);
            })
            .on("mousedown", function (d) {
                self.onMouseDownObject(this, d);
            })
            .on("mouseup", function (d) {
                self.onMouseUpObject(this, d);
            })
            .on("click", function (d) {
                self.onMouseClickObject(this, d);
            })
            .call(this.drag);

        this.places.exit()
            .remove();

        this.places
            .classed("place", true)
            .attr("cx", function (d) { return d.x; })
            .attr("cy", function (d) { return d.y; })
            .attr("r", 15);


        /* TRANSITIONS */
        this.transitions = this.transitions.data(self.net.objects.filter(function (d) { return d.type === 'transition'; }));

        this.transitions.enter()
            .append("rect")
            .on("mouseover", function (d) {
                self.onMouseOverObject(this, d);
            })
            .on("mouseout", function (d) {
                self.onMouseOutObject(this, d);
            })
            .on("mousedown", function (d) {
                self.onMouseDownObject(this, d);
            })
            .on("mouseup", function (d) {
                self.onMouseUpObject(this, d);
            })
            .on("click", function (d) {
                self.onMouseClickObject(this, d);
            })
            .call(this.drag);

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
        var self = this;

        self.width = parseInt(self.outerContainer.style("width"));
        self.height = parseInt(self.outerContainer.style("height"));

        self.svg
            .style("width", self.width)
            .style("height", self.height);
    }

    PetriNetEditor.prototype.onZoom = function () {
        var self = this;

        self.container
            .attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
    }

    PetriNetEditor.prototype.onDragStart = function (elem, d) {
        var self = this;

        d3.event.sourceEvent.stopPropagation();

        d3.select(elem).classed("dragging", true);
    }

    PetriNetEditor.prototype.onDrag = function (elem, d) {
        var self = this;

        d.x = d3.event.x;
        d.y = d3.event.y;
        self.draw();
    }

    PetriNetEditor.prototype.onDragEnd = function (elem, d) {
        var self = this;

        d3.select(elem).classed("dragging", false);
        self.queueSaveToLocalStorage();
    }

    PetriNetEditor.prototype.onKeyUp = function () {
        var self = this;

        switch(d3.event.keyCode) {
        case KEY_ESC:
            if (self.selectedObject) {
                self.selectedObject.elem.classed('selected', false);
                self.selectedObject = undefined;
            }
            break;
        }
    }

    PetriNetEditor.prototype.onMouseOverObject = function (elem, d) {
        var self = this;

        self.newArcOver(elem, d);
    }

    PetriNetEditor.prototype.onMouseOutObject = function (elem, d) {
        var self = this;

        self.newArcOut(elem, d);
    }

    PetriNetEditor.prototype.onMouseClick = function (elem) {
        var self = this;

        if (self.selectedObject) {
            self.selectedObject.elem.classed('selected', false);
            self.selectedObject = undefined;
        }

        self.setTools(0);

        self.newArcEnd();
    }

    PetriNetEditor.prototype.onMouseDown = function () {
        var self = this;

        self.crosshairPos = d3.mouse(self.container.node());

        self.crosshair
            .style("display", "block")
            .attr("transform", "translate(" + self.crosshairPos[0] + ", " + self.crosshairPos[1] + ")");
    }

    PetriNetEditor.prototype.onMouseMove = function () {
        var self = this;

        self.newArcMove();
    }

    PetriNetEditor.prototype.onMouseDownObject = function (elem, d) {
        var self = this;

        d3.event.stopPropagation();

        self.crosshair
            .style("display", "none");
    }

    PetriNetEditor.prototype.onMouseUpObject = function (elem, d) {
        var self = this;

        self.newArcEnd(elem, d);
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

        if (d.type === "arc") {
            self.setTools(2);
        }
        else {
            self.setTools(1);
        }
    }

    PetriNetEditor.prototype.newArcStart = function (elem, d) {
        var self = this;

        self.newArc = {};

        self.newArc.src = {
            elem: elem,
            data: d
        };

        self.newArc.path = self.container.append("path")
            .style('marker-end', 'url(#end-arrow)')
            .classed("arc", true);

        self.newArc.src.elem.classed("dragging", true);

        if (d.type === 'place')
            self.places.classed("faded", true);
        else
            self.transitions.classed("faded", true);

        self.arcs.classed("faded", true);
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
                for (var i=0; i<self.net.objects.length; i++) {
                    if (self.net.objects[i].type !== 'arc')
                        continue;

                    if ((self.net.objects[i].source == source.data.id) &&
                        (self.net.objects[i].target == target.data.id)) {
                        exists = true;
                        break;
                    }
                }

                if (!exists) {
                    self.net.objects.push({
                        id: self.net.idSeq++,
                        type: "arc",
                        source: source.data.id,
                        target: target.data.id
                    });

                    self.queueSaveToLocalStorage();
                    self.draw();
                }
            }
        }

        if (self.newArc.target)
            self.newArc.target.elem.classed('dragging', false);
        if (self.newArc.src)
            self.newArc.src.elem.classed('dragging', false);

         if (self.newArc.src.data.type === 'place')
            self.places.classed("faded", false);
        else
            self.transitions.classed("faded", false);

        self.arcs.classed("faded", false);

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

    PetriNetEditor.prototype.deleteObject = function (elem, d) {
        var self = this;

        function doRemove(objId) {
            for (var i=0; i<self.net.objects.length; i++) {
                if (self.net.objects[i].type === "arc") {
                    if ((self.net.objects[i].source == objId) ||
                        (self.net.objects[i].target == objId)) {
                        self.net.objects.splice(i, 1);
                        doRemove(objId);
                        break;
                    }
                }

                if (self.net.objects[i].id === objId) {
                    self.net.objects.splice(i, 1);
                    doRemove(objId);
                    break;
                }
            }
        }

        doRemove(d.id);

        self.queueSaveToLocalStorage();
        self.draw();
    }

    PetriNetEditor.prototype.setTools = function (type) {
        var self = this;

        var buttons = [];

        if (type == 0) {
            buttons = [
                {
                    text: 'Add Place',
                    action: function () {
                        self.net.objects.push({
                            id: self.net.idSeq++,
                            type: "place",
                            x: self.crosshairPos[0],
                            y: self.crosshairPos[1]
                        });

                        self.queueSaveToLocalStorage();
                        self.draw();
                    }
                },
                {
                    text: 'Add Transition',
                    action: function () {
                        self.net.objects.push({
                            id: self.net.idSeq++,
                            type: "transition",
                            x: self.crosshairPos[0],
                            y: self.crosshairPos[1]
                        });

                        self.queueSaveToLocalStorage();
                        self.draw();
                    }
                }
            ]
        }
        else if (type == 1) {
            buttons = [
                {
                    text: 'Add Arc',
                    action: function () {
                        self.newArcStart(self.selectedObject.elem, self.selectedObject.data);
                    }
                },
                {
                    text: 'Delete',
                    action: function () {
                        self.deleteObject(self.selectedObject.elem, self.selectedObject.data);
                    }
                }
            ]
        }
        else if (type == 2) {
            buttons = [
                {
                    text: 'Delete',
                    action: function () {
                        self.deleteObject(self.selectedObject.elem, self.selectedObject.data);
                    }
                }
            ]
        }

        self.toolsContainer.selectAll("*").remove();
        self.toolsContainer.selectAll("button")
            .data(buttons)
            .enter()
            .append("button")
            .classed("btn", true)
            .classed("btn-default", true)
            .classed("navbar-btn", true)
            .text(function (d) { return d.text; })
            .on("click", function (d) {
                if (typeof d.action === 'function') {
                    d3.event.preventDefault();
                    d.action(this);
                }
            });
    }

    PetriNetEditor.prototype.clear = function () {
        var self = this;

        self.net = { idSeq: 0, objects: [] };
        self.queueSaveToLocalStorage();
        self.draw();
    }

    return PetriNetEditor;
});