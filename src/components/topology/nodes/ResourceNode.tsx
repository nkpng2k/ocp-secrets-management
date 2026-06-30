import * as React from 'react';
import {
  DefaultNode,
  LabelPosition,
  Node,
  observer,
  WithSelectionProps,
} from '@patternfly/react-topology';
import { GraphNodeData } from '../model/types';
import { NODE_PROVIDER } from '../model/buildCSIGraphModel';

interface ResourceNodeProps extends WithSelectionProps {
  element: Node;
}

const ResourceNode: React.FC<ResourceNodeProps> = observer(({ element, ...rest }) => {
  const data = element.getData() as GraphNodeData | undefined;
  const isProvider = element.getType() === NODE_PROVIDER;

  return (
    <DefaultNode
      element={element}
      badge={data?.badge}
      badgeColor={data?.badgeColor}
      showStatusDecorator
      showStatusBackground
      secondaryLabel={isProvider ? undefined : data?.kind}
      labelPosition={isProvider ? LabelPosition.bottom : LabelPosition.top}
      {...rest}
    />
  );
});

export default ResourceNode;
