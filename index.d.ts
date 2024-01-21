import { FC, SVGProps } from 'react';
export interface tree<T> {
    data: T;
    children?: tree<T>[];
}
export interface BoxProps {
    path_props?: SVGProps<SVGPathElement>;
    rect_props?: SVGProps<SVGRectElement>;
    text_props?: SVGProps<SVGTextElement>;
    margin?: number;
    label: string;
    id?: string;
}
export interface BoxTreeProps {
    data: tree<BoxProps>;
    border?: number;
    padding: number;
    margin: number;
    path_props?: SVGProps<SVGPathElement>;
    rect_props?: SVGProps<SVGRectElement>;
    text_props?: SVGProps<SVGTextElement>;
}
export declare const BoxTree: FC<BoxTreeProps>;
export default BoxTree;
