# A Tiny Tree Hierarchy Graph

This is minimal tree hierarchy with no dependencies (other than react) that is just 3kb minified.  

* Nodes are represented using SVG text and rect elements
* Connectors are represented using SVG paths
* Styling can be applied to the graph overall or at the individual node level
* Supports typescript!

## Usage

```tsx
import React from 'react';
import BoxTree { tree, SimpleBoxProps } from "react-heirarchy-tree-graph2"

const DarkBlue = "#3f0fff"
const LightBlue = "#61a5ff"
const LightPurple = "#923afc"

const data: tree<SimpleBoxProps> = {
  data: { label: "Hello" },
  children: [
    { data: { label: "world" } },
    {
      data: {
        label: "This is a realy really really really long label",
        // Props to be applied to this particular element's <rect/>:
        rect_props: { fill: LightPurple, rx: "0px", stroke: "black", strokeWidth: "2px" },
        // Props to be applied to this particular element's <text/>:
        text_props: { fill: "white" }
      },
      children: [
        {
          data: { label: "Three" },
          children: [
            { data: { label: "Two" } },
            { data: { label: "more" } }
          ]
        },
        { data: { label: "short" } },
        { data: { label: "labels" } }
      ]
    }]
}

function App() {
  return (
      <BoxTree
        // data to be graphed
        data={data}
        // padding within the boxes in rem
        padding={.5}
        // margin around the boxes in rem
        margin={1}
        // extra space around the graph in px (* see below)
        border={2}
        // Props passed to the connector SVG `<path>` elements
        path_props={{ stroke: DarkBlue }}
        // Props passed to the background SVG `<rect/>` elements (unless overridden in the data)
        rect_props={{ fill: LightBlue, rx: ".4rem" }}
        // Props passed to the SVG `<text/>` elements (unless overridden in the data)
        text_props={{ fill: DarkBlue }}
      />
  );
}

export default App;
```

_*_ About the border property: The rendered element is a react `<svg>`
element whose size is *exactly* the width and height of the of the tree
**excluding any borders applied to the nodes**. When the border property is
supplied, the overall size of the rendered `<svg>` element is increased by
the border amount (in px) in order to prevent the outside borders of the
background `<rect>`s from being cut off

Result:

<svg width="370.03125" height="240"><path d="M 135.5625 171 L 135.5625 187" stroke="#3f0fff" stroke-width="2"></path><path d="M 219.984375 104 L 219.984375 120" stroke="#3f0fff" stroke-width="2"></path><path d="M 124.4765625 37 L 124.4765625 53" stroke="#3f0fff" stroke-width="2"></path><path d="M 234.5234375 120 L 234.5234375 136" stroke="#3f0fff" stroke-width="2"></path><path d="M 103.796875 203 L 103.796875 187 L 167.328125 187 L 167.328125 203" stroke="#3f0fff" stroke-width="2" fill="none"></path><path d="M 135.5625 136 L 135.5625 120 L 304.40625 120 L 304.40625 136" stroke="#3f0fff" stroke-width="2" fill="none"></path><path d="M 28.96875 69 L 28.96875 53 L 219.984375 53 L 219.984375 69" stroke="#3f0fff" stroke-width="2" fill="none"></path><rect x="98.8046875" y="2" height="35" width="51.34375" fill="#61a5ff" rx=".4rem"></rect><rect x="2" y="69" height="35" width="53.9375" fill="#61a5ff" rx=".4rem"></rect><rect x="71.9375" y="69" height="35" width="296.09375" fill="#923afc" rx="0px" stroke="black" stroke-width="2px"></rect><rect x="107.6640625" y="136" height="35" width="55.796875" fill="#61a5ff" rx=".4rem"></rect><rect x="81.6796875" y="203" height="35" width="44.234375" fill="#61a5ff" rx=".4rem"></rect><rect x="141.9140625" y="203" height="35" width="50.828125" fill="#61a5ff" rx=".4rem"></rect><rect x="208.7421875" y="136" height="35" width="51.5625" fill="#61a5ff" rx=".4rem"></rect><rect x="276.3046875" y="136" height="35" width="56.203125" fill="#61a5ff" rx=".4rem"></rect><text fill="#3f0fff" x="106.8046875" y="25.5">Hello</text><text fill="#3f0fff" x="10" y="92.5">world</text><text fill="white" x="79.9375" y="92.5">This is a realy really really really long label</text><text fill="#3f0fff" x="115.6640625" y="159.5">Three</text><text fill="#3f0fff" x="89.6796875" y="226.5">Two</text><text fill="#3f0fff" x="149.9140625" y="226.5">more</text><text fill="#3f0fff" x="216.7421875" y="159.5">short</text><text fill="#3f0fff" x="284.3046875" y="159.5">labels</text></svg>
