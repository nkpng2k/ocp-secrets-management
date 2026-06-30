import * as React from 'react';
import {
  DefaultNode,
  Node,
  observer,
  WithSelectionProps,
} from '@patternfly/react-topology';
import { GraphNodeData } from '../model/types';

interface ResourceNodeProps extends WithSelectionProps {
  element: Node;
}

const ResourceNode: React.FC<ResourceNodeProps> = observer(({ element, ...rest }) => {
  const data = element.getData() as GraphNodeData | undefined;

  return (
    <DefaultNode
      element={element}
      badge={data?.badge}
      badgeColor={data?.badgeColor}
      showStatusDecorator
      showStatusBackground
      {...rest}
    />
  );
});

export default ResourceNode;
