export type FieldDiagramTemplateKey = "full_pitch" | "half_pitch";

export type PitchBackground =
  | { kind: "template"; key: FieldDiagramTemplateKey }
  | { kind: "image"; url: string };

export type DiagramPlayer = {
  id: string;
  type: "player";
  team: "A" | "B";
  x: number;
  y: number;
  label?: string;
};

export type DiagramCone = {
  id: string;
  type: "cone";
  x: number;
  y: number;
};

export type DiagramGoal = {
  id: string;
  type: "goal";
  x: number;
  y: number;
};

export type DiagramBall = {
  id: string;
  type: "ball";
  x: number;
  y: number;
};

export type DiagramRect = {
  id: string;
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  stroke?: string;
  fill?: string;
  opacity?: number;
};

export type DiagramCircleShape = {
  id: string;
  type: "circle";
  x: number;
  y: number;
  r: number;
  stroke?: string;
  fill?: string;
  opacity?: number;
};

export type DiagramArrow = {
  id: string;
  type: "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dashed?: boolean;
  thickness?: number;
};

export type DiagramText = {
  id: string;
  type: "text";
  x: number;
  y: number;
  text: string;
};

export type DiagramObject =
  | DiagramPlayer
  | DiagramCone
  | DiagramGoal
  | DiagramBall
  | DiagramArrow
  | DiagramText
  | DiagramRect
  | DiagramCircleShape;

export type FieldDiagramState = {
  version: 1;
  background: PitchBackground | FieldDiagramTemplateKey; // FieldDiagramTemplateKey solo para compat legacy
  objects: DiagramObject[];
  renderedImage?: string;
  renderedImageUrl?: string;
};
