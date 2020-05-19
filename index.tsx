import React, { FC, useRef, useState, useEffect, createRef, SVGProps } from 'react';

export interface tree<T> {
    data: T;
    children?: tree<T>[];
}

// parameters that get pushed down from the parent to the child
interface pushDownParams {
    // top left corner of the child element / tree
    x_offset: number;
    y_offset: number;
    // depth of the child in the tree
    depth: number;
}

// --------------------------------------------------
// UTILITY FUNCTIONS
// --------------------------------------------------


// TYPE PARAMETERS:
// T: Input type
// R: return type
// S: pass down type
function walk2<T, R = any, S = undefined>(
    // the tree to walk
    x: tree<T>,
    // the function to call at each node:
    f: (y: T,
        next: (x: S) => tree<R> | null,
        d: S) => R,
    // the data to onto the top parent ( and which starts the )
    d: S): tree<R> {

    let i: number = 0; // local counter
    let children: tree<R>[] = [] // for collecting results from the children

    // the function which enables iterating over the children within `f`
    const next = ((dd: S) => {

        if ((!x.children) || i >= x.children.length) {
            // x has no children or the iteration is complete
            return null
        }

        // recurse
        const out = walk2(x.children[i], f, dd);

        children[0] = out
        i += 1
        return out

    });

    const data = f(x.data, next, d)

    // return 
    if (x.children) {
        if (i < x.children.length)
            throw new Error("iteration incomplete")
        return { data, children }
    }
    return { data }

}


// simple walker TDLR walker
function walk<T, S = any>(x: tree<T>, f: (y: T, d: number) => S, d: number = 0): tree<S> {
    const out: tree<S> = { data: f(x.data, d) }
    if (x.children) {
        out.children = x.children.map(z => walk(z, f, d + 1))
    }
    return out
}


export interface BoxProps {

    path_props?: SVGProps<SVGPathElement>
    rect_props?: SVGProps<SVGRectElement>
    text_props?: SVGProps<SVGTextElement>
    margin?: number; // margin in logical px
    label: string; // contents
    id?: string; // selector
}

interface textBox {
    height: number; // overall height
    width: number; // overall width
    baseline: number; // height above baseline
}

interface xy {
    x: number;
    y: number;
}
interface hw {
    height: number;
    width: number;
}

interface rect_params {
    x: number;
    y: number;
    height: number;
    width: number;
}

export interface BoxTreeProps {

    // the data to be rendered
    data: tree<BoxProps>;
    
    // margin around the outer boxes
    border?: number;

    // padding in REM
    padding: number;
    
    // margin in REM
    margin: number;

    // properties for the paths (connectors)
    path_props?: SVGProps<SVGPathElement>

    // properties for the rect elements
    rect_props?: SVGProps<SVGRectElement>

    // properties for the text elements
    text_props?: SVGProps<SVGTextElement>
}

// default props
const DEFAULT_TEXT_PROPS: SVGProps<SVGTextElement> = { fill: "black" }
const DEFAULT_RECT_PROPS: SVGProps<SVGRectElement> = { fill: "#bfbfbf" }

const DEFAULT_PATH_PROPS: SVGProps<SVGPathElement> = { stroke: "black", strokeWidth: 2 }


export const BoxTree: FC<BoxTreeProps> = (props) => {

    // EXTRACT PROPS
    const { data, padding, margin, border } = props;
    // combine the path and rect props

    // --------------------------------------------------
    // convert rem to px
    // --------------------------------------------------

    const remRef = useRef<SVGRectElement>(null)
    const [rem, setRem] = useState<number>(0)
    useEffect(() => {
        if (remRef && remRef.current) {
            setRem(remRef.current.getBBox().width)
        }
    }, [remRef, setRem])

    // --------------------------------------------------
    // LABELS
    // --------------------------------------------------

    // the labels 
    const [labels, setLabels] = useState<string[]>()

    const [size, setSize] = useState<hw>({ width: 0, height: 0 })

    // element references for the text boxes
    const [textRefs, setElRefs] = React.useState<React.RefObject<SVGTextElement>[]>([]);

    // background rectangle dimensions (height, width, baseline offset)
    const [textBGDims, setTextBGDims] = useState<(textBox | null)[]>()

    // positions of the text boxes and background rectangles
    const [textPositions, setTextPositions] = useState<xy[]>()
    const [bgRects, setBGRects] = useState<rect_params[]>()

    // INDIVIDUAL ELEMENT STYLES
    const [rect_props, set_rect_props] = useState<SVGProps<SVGRectElement>[]>()
    const [text_props, set_text_props] = useState<SVGProps<SVGTextElement>[]>()

    useEffect(() => {

        // gather the labels from the input tree
        const lbls: string[] = [];

        const RECT_PROPS: SVGProps<SVGRectElement>[] = []
        const TEXT_PROPS: SVGProps<SVGTextElement>[] = []

        const default_text_props:SVGProps<SVGTextElement> = {...DEFAULT_TEXT_PROPS,...props.text_props}
        const default_rect_props:SVGProps<SVGRectElement> = {...DEFAULT_RECT_PROPS,...props.rect_props}

        walk(data, (x: BoxProps) => {
            lbls.push(x.label)
            RECT_PROPS.push(x.rect_props?{ ...default_rect_props,...x.rect_props }: default_rect_props)
            TEXT_PROPS.push(x.text_props?{ ...default_text_props,...x.text_props }: default_text_props)
        })

        // create the text element refs
        setElRefs(textRefs => (
            Array(lbls.length).fill(undefined).map((_, i) => textRefs[i] || createRef())
        ));

        // set the list of labels extracted from the input tree
        setLabels(lbls)

        // initialize the text backgrounds to null (for testing if the textrefs have all been set)
        setTextBGDims(lbls.map(_ => null))

        // initialize the text positions to 0, 0 
        setTextPositions(lbls.map(_ => ({ x: 0, y: 0 })))

        set_rect_props(RECT_PROPS)
        set_text_props(TEXT_PROPS)

    }, [data, props.rect_props, props.text_props])

    // --------------------------------------------------
    // gather the Text Box Dimensions
    // --------------------------------------------------


    // dimensions of the connectors
    const [tails, setTails] = useState<xy[][]>()
    const [heads, setHeads] = useState<xy[][]>()
    const [lrbounds, setLRBounds] = useState<xy[][]>()

    useEffect(() => {
        if (!textBGDims) return

        let BOXDIMS: (textBox | null)[] = [...textBGDims]
        let updated: boolean = false;

        for (let [i, textRef] of textRefs.entries()) {

            if (BOXDIMS[i] || !textRef || !(textRef.current)) return

            const bbox = textRef.current.getBBox()
            BOXDIMS = [
                ...BOXDIMS.slice(0, i),
                {
                    height: bbox.height + 2 * padding * rem,
                    width: bbox.width + 2 * padding * rem,
                    baseline: - bbox.y + padding * rem,
                },
                ...BOXDIMS.slice(i + 1)
            ]
            updated = true;
        }

        if (updated) {
            setTextBGDims(BOXDIMS)
        }

    }, [textRefs, textBGDims, padding, rem]); // 

    // --------------------------------------------------
    // create the layout
    // --------------------------------------------------

    useEffect(() => {

        if (!textBGDims || !textBGDims.every(x => !!x)) {
            // the box dimensions have not been gathered yet
            return
        }

        // Compute the row heights (across all the sub-trees.)
        let i: number = 0;
        const row_height: number[] = []
        walk(data, (x: BoxProps, d: number) => {
            row_height[d] = Math.max(row_height[d] || 0, textBGDims[i++]!.height);
        })

        // xy positions of the text boxes
        const textPos: xy[] = [];

        // x,y,width,height of the background boxes
        const bgRects: rect_params[] = [];

        // GEOMETRY OF THE CONNECTORS:
        // tails are the parts that go down below a parent node
        const TAILS: xy[][] = [];
        // heads are the lines that go up from the middle chidren and connect to the cross member
        const HEADS: xy[][] = [];
        // lr bounds ar the bounds of the cross member
        const LRBOUNDS: xy[][] = [];

        i = 0; // reset the counter

        const TB: tree<textBox & { bgRect: rect_params }> = walk2<BoxProps, textBox & { bgRect: rect_params }, pushDownParams>(data, (x, next, d) => {

            // array indexes
            const [T, H, L] = [TAILS.length, HEADS.length, LRBOUNDS.length]
            const j = i++

            // attributes of the current element
            const BGdims: textBox = textBGDims[j]!

            // attributes of the children of this element
            const y_offset = d.y_offset + row_height[d.depth] + 2 * margin * rem;
            const depth = d.depth + 1

            // width of all the children, including the margins between them
            let cw: number = 0;
            // the array of centers of each of the immediate child
            let centers: number[] = [];

            // iterate over the children, and get their attributes
            let child = next({ x_offset: d.x_offset + cw, y_offset, depth })
            while (child) {
                centers.push(child.data.bgRect.x + child.data.bgRect.width / 2)
                cw += margin * rem + child.data.width
                child = next({ x_offset: d.x_offset + cw, y_offset, depth })
            }
            cw -= margin * rem

            if (centers.length) { // THIS NODE HAS CHILDREN

                // the x position of the top of the connector
                let tree_head = (centers[0] + centers[centers.length - 1]) / 2
                // the center of the current element
                let my_center = d.x_offset + BGdims.width / 2

                if (centers.length > 1) {

                    // more than one child
                    TAILS.push([
                        {
                            x: tree_head,
                            y: d.y_offset + BGdims.height
                        }, {
                            x: tree_head,
                            y: y_offset - margin * rem
                        },])
                    HEADS.push(...centers.slice(1, -1).map(x => [
                        {
                            x: x,
                            y: y_offset - margin * rem
                        }, {
                            x: x,
                            y: y_offset
                        },]))
                    LRBOUNDS.push([
                        {
                            x: centers[0],
                            y: y_offset
                        }, {
                            x: centers[centers.length - 1],
                            y: y_offset
                        },])

                } else {

                    // exactly one child
                    TAILS.push([
                        {
                            x: tree_head,
                            y: d.y_offset + BGdims.height
                        }, {
                            x: tree_head,
                            y: y_offset
                        },])

                }

                // (POSSIBLY) SHIFT THE CURRENT NODE OR IT'S CHILDREN IN ORDER ALIGN THE GRAPH

                if (tree_head > my_center && cw > BGdims.width) {
                    // this node is smaller than the children node's middle is to the left of the tree head 
                    d.x_offset += Math.min(tree_head - my_center, cw - BGdims.width)
                }

                if (my_center > tree_head && BGdims.width > cw) {
                    // this node is larger than the children and this node's middle is to the right of the of the tree head 
                    let shift = Math.min(my_center - tree_head, BGdims.width - cw)

                    tree_head += shift
                    centers = centers.map(x => x + shift)

                    LRBOUNDS.slice(L).forEach(d => {
                        d[0].x += shift
                        d[1].x += shift
                    })

                    HEADS.slice(H).forEach(d => {
                        d[0].x += shift
                        d[1].x += shift
                    })

                    TAILS.slice(T).forEach(d => {
                        d[0].x += shift
                        d[1].x += shift
                    })

                    textPos.slice(j, i).forEach(d => { d.x += shift })
                    bgRects.slice(j, i).forEach(d => { d.x += shift })
                }
            }

            // SVG PARAMETERS OF THE CURRENT BACKGROUND
            const BGRECT = {
                x: d.x_offset,
                y: d.y_offset,
                height: BGdims.height,
                width: BGdims.width,
            }

            // SVG PARAMETERS TEXT ELEMENT
            textPos[j] = {
                x: BGRECT.x + padding * rem,
                y: BGRECT.y + BGdims.baseline
            }

            bgRects[j] = BGRECT

            // send these parameters to the parent when it calles next()
            return {
                height: BGdims.height + 2 * margin * rem,
                width: ((cw > 0) ? Math.max(BGdims.width, cw) : BGdims.width),
                baseline: BGdims.baseline,
                bgRect: BGRECT,
            }

        },
            // initial values for the push-down parameters 
            { x_offset: border || 0, y_offset: border || 0, depth: 0 })

        // SAVE ALL THE DIMENSIONS
        setTails(TAILS)
        setHeads(HEADS)
        setLRBounds(LRBOUNDS)
        setSize({
            width: TB.data.width + 2 * (border||0),
            height: row_height.reduce((x, y) => x + y, 0) + 2 * (row_height.length - 1) * margin * rem + 2 * (border||0),
        })
        setTextPositions(textPos)
        setBGRects(bgRects)

    }, [textBGDims, data, rem, margin, padding, border]); // 

    // combine the path props
    const PATH_PROPS: SVGProps<SVGPathElement> = { ...DEFAULT_PATH_PROPS, ...props.path_props }

    return (<svg {...size} >
        {
            tails ?
                tails.map((x, i) => (
                    <path d={`M ${x[0].x} ${x[0].y} L ${x[1].x} ${x[1].y}`}
                        {...PATH_PROPS}
                        key={i} />
                ))
                : null
        }
        {
            heads ?
                heads.map((x, i) => (
                    <path d={`M ${x[0].x} ${x[0].y} L ${x[1].x} ${x[1].y}`}
                        {...PATH_PROPS}
                        key={i} />))
                : null
        }
        {
            lrbounds ?
                lrbounds.map((x, i) => (<path
                    d={`M ${x[0].x} ${x[0].y} L ${x[0].x} ${x[0].y - margin * rem} L ${x[1].x} ${x[1].y - margin * rem} L ${x[1].x} ${x[1].y}`}
                    {...PATH_PROPS}
                    fill="none"
                    key={i} />
                ))
                : null
        }

        { // the test rect to calculate px / REM 
            (rem === 0) ? <rect ref={remRef} width={"1rem"} height={"1rem"} /> : null
        }
        { // backgrounds for the text elements
            bgRects ?
                bgRects.map((bg, i) => <rect
                    {...bg}
                    {...rect_props![i]}
                    key={i} />)
                : null
        }

        { // the labels
            labels ?
                labels.map((label, i) => {
                    const xy = textPositions![i];
                    return (
                        <text
                            {...text_props![i]}
                            x={xy.x}
                            y={xy.y}
                            ref={textRefs[i]}
                            key={i} >{label}</text>)
                })
                : null
        }

    </svg>)
}
