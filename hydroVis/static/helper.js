class Tooltip {
    constructor(selection, callback, vpWidth, vpHeight) {
        if (!selection || !selection.size()) {
            throw "Requires a tooltip div element selection";
        }
        if (!callback || typeof callback !== "function") {
            throw "ToolTip.display requires a callback function that returns an HTML string";
        }
        this._callback = callback;
        this._selection = selection;
        this.vpWidth = vpWidth;
        this.vpHeight = vpHeight;
    }
  
    move(event) {
        if (!event) return;
        // const margin = Math.round(this.vpWidth * 0.1);
        const { clientX: x, clientY: y } = event;
        const left = x;
        // this.clamp(
        //     margin,
        //     x,
        //     this.vpWidth - margin
        // );
        const top = y;
        // window.innerHeight > y + margin + this.vpHeight
        //   ? y + margin
        //   : y - this.vpHeight - margin;
        this.selection.style("top", `${top}px`).style("left", `${left}px`);
    }
  
    display(datum) {
        this.selection.style("display", "block").html(this._callback(datum));
    }
  
    hide() {
        this.selection.style("display", "none").html("");
    }
  
    clamp(min, d, max) {
        return Math.max(min, Math.min(max, d));
    }
  
    get selection() {
        return this._selection;
    }
  
    set selection(sel) {
        if (sel && sel.size()) {
            this._selection = sel;
        } 
        else {
            throw "selection must be a non-empty selected element";
        }
    }
}

export function setupTooltip(vpWidth, vpHeight) {
    const tooltipDiv = d3.select("#geoMap-div")
                        .append("div")
                        .attr("id", "tooltip-div");

    function setupTooltipContent(d) {
        if ('line' in d) {
            return "LinkID: " + d.linkID + "<br/>Src: " + d.line.coordinates[0].map(x => x.toFixed(2)).join(', ') + "<br/>Dst: " + 
                    d.line.coordinates[d.line.coordinates.length-1].map(x => x.toFixed(2)).join(', ') + 
                    (('qlink1' in d) ? ("<br/>Value: " + d3.format(".3")(d.qlink1) + " cu.m/s") : "") + (('z_gwsubbas' in d) ? "<br/>Value: " + d3.format(".3")(d.z_gwsubbas) + " m": "");
        }
        else {
            const lon = (d.location[0] > 180) ? d.location[0] - 360 : ((d.location[0] < -180) ? d.location[0] + 360 : d.location[0]);
            return "Gauge Location: (" + Math.round(lon * 100)/100 + ", " + Math.round(d.location[1] * 100)/100 + ")<br/>LinkID: " + d.linkID;
        }
    }

    const tooltip = new Tooltip(tooltipDiv, setupTooltipContent, vpWidth, vpHeight);
    return tooltip;
}

export function getJSDateObjectFromTimestamp(timestampString) {
    return new Date(
        timestampString.substring(0,4),   // year
        timestampString.substring(4,6),    // month
        timestampString.substring(6,8),   // day
        timestampString.substring(8)  // hours
    );
}

export const wrfHydroStateVariables = {
    qlink1: {
        commonName: 'Streamflow',
        units: 'cubic meter/second',
        description: 'Amount of water flow per unit time'
    },
    z_gwsubbas: {
        commonName: 'Bucket',
        units: 'meter',
        description: 'Elevation of water in the basin or bucket'
    }
}