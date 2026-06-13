type ElementNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: ElementNode[];
};

function visitImages(node: ElementNode): void {
  if (node.type === "element" && node.tagName === "img") {
    node.properties ??= {};
    node.properties.loading ??= "lazy";
    node.properties.decoding ??= "async";
  }

  for (const child of node.children ?? []) {
    visitImages(child);
  }
}

export function rehypeLazyImages() {
  return (tree: ElementNode) => visitImages(tree);
}
