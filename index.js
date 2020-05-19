import React, { useRef, useState, useEffect, createRef } from 'react';
// --------------------------------------------------
// UTILITY FUNCTIONS
// --------------------------------------------------
// TYPE PARAMETERS:
// T: Input type
// R: return type
// S: pass down type
function walk2(
// the tree to walk
x, 
// the function to call at each node:
f, 
// the data to onto the top parent ( and which starts the )
d) {
    let i = 0; // local counter
    let children = []; // for collecting results from the children
    // the function which enables iterating over the children within `f`
    const next = ((dd) => {
        if ((!x.children) || i >= x.children.length) {
            // x has no children or the iteration is complete
            return null;
        }
        // recurse
        const out = walk2(x.children[i], f, dd);
        children[0] = out;
        i += 1;
        return out;
    });
    const data = f(x.data, next, d);
    // return 
    if (x.children) {
        if (i < x.children.length)
            throw new Error("iteration incomplete");
        return { data, children };
    }
    return { data };
}
// simple walker TDLR walker
function walk(x, f, d = 0) {
    const out = { data: f(x.data, d) };
    if (x.children) {
        out.children = x.children.map(z => walk(z, f, d + 1));
    }
    return out;
}
// default props
const DEFAULT_TEXT_PROPS = { fill: "black" };
const DEFAULT_RECT_PROPS = { fill: "#bfbfbf" };
const DEFAULT_PATH_PROPS = { stroke: "black", strokeWidth: 2 };
export const BoxTree = (props) => {
    // EXTRACT PROPS
    const { data, padding, margin, border } = props;
    // combine the path and rect props
    // --------------------------------------------------
    // convert rem to px
    // --------------------------------------------------
    const remRef = useRef(null);
    const [rem, setRem] = useState(0);
    useEffect(() => {
        if (remRef && remRef.current) {
            setRem(remRef.current.getBBox().width);
        }
    }, [remRef, setRem]);
    // --------------------------------------------------
    // LABELS
    // --------------------------------------------------
    // the labels 
    const [labels, setLabels] = useState();
    const [size, setSize] = useState({ width: 0, height: 0 });
    // element references for the text boxes
    const [textRefs, setElRefs] = React.useState([]);
    // background rectangle dimensions (height, width, baseline offset)
    const [textBGDims, setTextBGDims] = useState();
    // positions of the text boxes and background rectangles
    const [textPositions, setTextPositions] = useState();
    const [bgRects, setBGRects] = useState();
    // INDIVIDUAL ELEMENT STYLES
    const [rect_props, set_rect_props] = useState();
    const [text_props, set_text_props] = useState();
    useEffect(() => {
        // gather the labels from the input tree
        const lbls = [];
        const RECT_PROPS = [];
        const TEXT_PROPS = [];
        const default_text_props = Object.assign(Object.assign({}, DEFAULT_TEXT_PROPS), props.text_props);
        const default_rect_props = Object.assign(Object.assign({}, DEFAULT_RECT_PROPS), props.rect_props);
        walk(data, (x) => {
            lbls.push(x.label);
            RECT_PROPS.push(x.rect_props ? Object.assign(Object.assign({}, default_rect_props), x.rect_props) : default_rect_props);
            TEXT_PROPS.push(x.text_props ? Object.assign(Object.assign({}, default_text_props), x.text_props) : default_text_props);
        });
        // create the text element refs
        setElRefs(textRefs => (Array(lbls.length).fill(undefined).map((_, i) => textRefs[i] || createRef())));
        // set the list of labels extracted from the input tree
        setLabels(lbls);
        // initialize the text backgrounds to null (for testing if the textrefs have all been set)
        setTextBGDims(lbls.map(_ => null));
        // initialize the text positions to 0, 0 
        setTextPositions(lbls.map(_ => ({ x: 0, y: 0 })));
        set_rect_props(RECT_PROPS);
        set_text_props(TEXT_PROPS);
    }, [data, props.rect_props, props.text_props]);
    // --------------------------------------------------
    // gather the Text Box Dimensions
    // --------------------------------------------------
    // dimensions of the connectors
    const [tails, setTails] = useState();
    const [heads, setHeads] = useState();
    const [lrbounds, setLRBounds] = useState();
    useEffect(() => {
        if (!textBGDims)
            return;
        let BOXDIMS = [...textBGDims];
        let updated = false;
        for (let [i, textRef] of textRefs.entries()) {
            if (BOXDIMS[i] || !textRef || !(textRef.current))
                return;
            const bbox = textRef.current.getBBox();
            BOXDIMS = [
                ...BOXDIMS.slice(0, i),
                {
                    height: bbox.height + 2 * padding * rem,
                    width: bbox.width + 2 * padding * rem,
                    baseline: -bbox.y + padding * rem,
                },
                ...BOXDIMS.slice(i + 1)
            ];
            updated = true;
        }
        if (updated) {
            setTextBGDims(BOXDIMS);
        }
    }, [textRefs, textBGDims, padding, rem]); // 
    // --------------------------------------------------
    // create the layout
    // --------------------------------------------------
    useEffect(() => {
        if (!textBGDims || !textBGDims.every(x => !!x)) {
            // the box dimensions have not been gathered yet
            return;
        }
        // Compute the row heights (across all the sub-trees.)
        let i = 0;
        const row_height = [];
        walk(data, (x, d) => {
            row_height[d] = Math.max(row_height[d] || 0, textBGDims[i++].height);
        });
        // xy positions of the text boxes
        const textPos = [];
        // x,y,width,height of the background boxes
        const bgRects = [];
        // GEOMETRY OF THE CONNECTORS:
        // tails are the parts that go down below a parent node
        const TAILS = [];
        // heads are the lines that go up from the middle chidren and connect to the cross member
        const HEADS = [];
        // lr bounds ar the bounds of the cross member
        const LRBOUNDS = [];
        i = 0; // reset the counter
        const TB = walk2(data, (x, next, d) => {
            // array indexes
            const [T, H, L] = [TAILS.length, HEADS.length, LRBOUNDS.length];
            const j = i++;
            // attributes of the current element
            const BGdims = textBGDims[j];
            // attributes of the children of this element
            const y_offset = d.y_offset + row_height[d.depth] + 2 * margin * rem;
            const depth = d.depth + 1;
            // width of all the children, including the margins between them
            let cw = 0;
            // the array of centers of each of the immediate child
            let centers = [];
            // iterate over the children, and get their attributes
            let child = next({ x_offset: d.x_offset + cw, y_offset, depth });
            while (child) {
                centers.push(child.data.bgRect.x + child.data.bgRect.width / 2);
                cw += margin * rem + child.data.width;
                child = next({ x_offset: d.x_offset + cw, y_offset, depth });
            }
            cw -= margin * rem;
            if (centers.length) { // THIS NODE HAS CHILDREN
                // the x position of the top of the connector
                let tree_head = (centers[0] + centers[centers.length - 1]) / 2;
                // the center of the current element
                let my_center = d.x_offset + BGdims.width / 2;
                if (centers.length > 1) {
                    // more than one child
                    TAILS.push([
                        {
                            x: tree_head,
                            y: d.y_offset + BGdims.height
                        }, {
                            x: tree_head,
                            y: y_offset - margin * rem
                        },
                    ]);
                    HEADS.push(...centers.slice(1, -1).map(x => [
                        {
                            x: x,
                            y: y_offset - margin * rem
                        }, {
                            x: x,
                            y: y_offset
                        },
                    ]));
                    LRBOUNDS.push([
                        {
                            x: centers[0],
                            y: y_offset
                        }, {
                            x: centers[centers.length - 1],
                            y: y_offset
                        },
                    ]);
                }
                else {
                    // exactly one child
                    TAILS.push([
                        {
                            x: tree_head,
                            y: d.y_offset + BGdims.height
                        }, {
                            x: tree_head,
                            y: y_offset
                        },
                    ]);
                }
                // (POSSIBLY) SHIFT THE CURRENT NODE OR IT'S CHILDREN IN ORDER ALIGN THE GRAPH
                if (tree_head > my_center && cw > BGdims.width) {
                    // this node is smaller than the children node's middle is to the left of the tree head 
                    d.x_offset += Math.min(tree_head - my_center, cw - BGdims.width);
                }
                if (my_center > tree_head && BGdims.width > cw) {
                    // this node is larger than the children and this node's middle is to the right of the of the tree head 
                    let shift = Math.min(my_center - tree_head, BGdims.width - cw);
                    tree_head += shift;
                    centers = centers.map(x => x + shift);
                    LRBOUNDS.slice(L).forEach(d => {
                        d[0].x += shift;
                        d[1].x += shift;
                    });
                    HEADS.slice(H).forEach(d => {
                        d[0].x += shift;
                        d[1].x += shift;
                    });
                    TAILS.slice(T).forEach(d => {
                        d[0].x += shift;
                        d[1].x += shift;
                    });
                    textPos.slice(j, i).forEach(d => { d.x += shift; });
                    bgRects.slice(j, i).forEach(d => { d.x += shift; });
                }
            }
            // SVG PARAMETERS OF THE CURRENT BACKGROUND
            const BGRECT = {
                x: d.x_offset,
                y: d.y_offset,
                height: BGdims.height,
                width: BGdims.width,
            };
            // SVG PARAMETERS TEXT ELEMENT
            textPos[j] = {
                x: BGRECT.x + padding * rem,
                y: BGRECT.y + BGdims.baseline
            };
            bgRects[j] = BGRECT;
            // send these parameters to the parent when it calles next()
            return {
                height: BGdims.height + 2 * margin * rem,
                width: ((cw > 0) ? Math.max(BGdims.width, cw) : BGdims.width),
                baseline: BGdims.baseline,
                bgRect: BGRECT,
            };
        }, 
        // initial values for the push-down parameters 
        { x_offset: border || 0, y_offset: border || 0, depth: 0 });
        // SAVE ALL THE DIMENSIONS
        setTails(TAILS);
        setHeads(HEADS);
        setLRBounds(LRBOUNDS);
        setSize({
            width: TB.data.width + 2 * (border || 0),
            height: row_height.reduce((x, y) => x + y, 0) + 2 * (row_height.length - 1) * margin * rem + 2 * (border || 0),
        });
        setTextPositions(textPos);
        setBGRects(bgRects);
    }, [textBGDims, data, rem, margin, padding, border]); // 
    // combine the path props
    const PATH_PROPS = Object.assign(Object.assign({}, DEFAULT_PATH_PROPS), props.path_props);
    return (React.createElement("svg", Object.assign({}, size),
        tails ?
            tails.map((x, i) => (React.createElement("path", Object.assign({ d: `M ${x[0].x} ${x[0].y} L ${x[1].x} ${x[1].y}` }, PATH_PROPS, { key: i }))))
            : null,
        heads ?
            heads.map((x, i) => (React.createElement("path", Object.assign({ d: `M ${x[0].x} ${x[0].y} L ${x[1].x} ${x[1].y}` }, PATH_PROPS, { key: i }))))
            : null,
        lrbounds ?
            lrbounds.map((x, i) => (React.createElement("path", Object.assign({ d: `M ${x[0].x} ${x[0].y} L ${x[0].x} ${x[0].y - margin * rem} L ${x[1].x} ${x[1].y - margin * rem} L ${x[1].x} ${x[1].y}` }, PATH_PROPS, { fill: "none", key: i }))))
            : null,
        (rem === 0) ? React.createElement("rect", { ref: remRef, width: "1rem", height: "1rem" }) : null,
        bgRects ?
            bgRects.map((bg, i) => React.createElement("rect", Object.assign({}, bg, rect_props[i], { key: i })))
            : null,
        labels ?
            labels.map((label, i) => {
                const xy = textPositions[i];
                return (React.createElement("text", Object.assign({}, text_props[i], { x: xy.x, y: xy.y, ref: textRefs[i], key: i }), label));
            })
            : null));
};
