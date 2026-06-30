import {
  ComponentFactory,
  GraphComponent,
  ModelKind,
  DefaultEdge,
  withPanZoom,
  withSelection,
} from '@patternfly/react-topology';
import ResourceNode from './ResourceNode';

const nodeFactory: ComponentFactory = (kind, type) => {
  if (kind === ModelKind.graph) {
    return withPanZoom()(GraphComponent);
  }
  if (kind === ModelKind.edge) {
    return DefaultEdge;
  }
  if (kind === ModelKind.node) {
    return withSelection()(ResourceNode);
  }
  return undefined;
};

export default nodeFactory;
