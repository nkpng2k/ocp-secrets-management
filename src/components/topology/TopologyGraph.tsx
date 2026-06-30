import * as React from 'react';
import {
  Model,
  GRAPH_LAYOUT_END_EVENT,
  SELECTION_EVENT,
  SelectionEventListener,
  TopologyControlBar,
  TopologyView,
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  DagreLayout,
  LEFT_TO_RIGHT,
  TOP_TO_BOTTOM,
  LayoutFactory,
  useVisualizationController,
} from '@patternfly/react-topology';
import { Button, Tooltip } from '@patternfly/react-core';
import {
  LongArrowAltRightIcon,
  LongArrowAltDownIcon,
} from '@patternfly/react-icons';
import nodeFactory from './nodes/nodeFactory';
import './TopologyGraph.css';

interface TopologyGraphInnerProps {
  model: Model;
  vertical: boolean;
  onToggleDirection: () => void;
  onSelect: (ids: string[]) => void;
}

const TopologyGraphInner: React.FC<TopologyGraphInnerProps> = ({
  model,
  vertical,
  onToggleDirection,
  onSelect,
}) => {
  const controller = useVisualizationController();
  const initialized = React.useRef(false);
  const prevVertical = React.useRef(vertical);

  React.useEffect(() => {
    controller.addEventListener<SelectionEventListener>(SELECTION_EVENT, onSelect);
    return () => {
      controller.removeEventListener(SELECTION_EVENT, onSelect);
    };
  }, [controller, onSelect]);

  React.useEffect(() => {
    const onLayoutEnd = () => {
      controller.getGraph().fit(80);
    };
    controller.addEventListener(GRAPH_LAYOUT_END_EVENT, onLayoutEnd);
    return () => {
      controller.removeEventListener(GRAPH_LAYOUT_END_EVENT, onLayoutEnd);
    };
  }, [controller]);

  React.useEffect(() => {
    const directionChanged = prevVertical.current !== vertical;
    prevVertical.current = vertical;

    controller.registerLayoutFactory(createLayoutFactory(vertical ? TOP_TO_BOTTOM : LEFT_TO_RIGHT));
    // Force non-merge rebuild when direction changes so the layout is recreated
    const merge = directionChanged ? false : initialized.current;
    controller.fromModel(model, merge);
    if (!initialized.current && model.nodes && model.nodes.length > 0) {
      initialized.current = true;
    }
  }, [model, vertical, controller]);

  return (
    <TopologyView
      controlBar={
        <TopologyControlBar
          controlButtons={createTopologyControlButtons({
            ...defaultControlButtonsOptions,
            zoomInCallback: () => controller.getGraph().scaleBy(4 / 3),
            zoomOutCallback: () => controller.getGraph().scaleBy(3 / 4),
            fitToScreenCallback: () => controller.getGraph().fit(80),
            resetViewCallback: () => controller.getGraph().reset(),
            expandAll: false,
            collapseAll: false,
            legend: false,
            customButtons: [
              {
                id: 'toggle-direction',
                icon: (
                  <Tooltip content={vertical ? 'Switch to horizontal' : 'Switch to vertical'}>
                    <Button variant="plain" onClick={onToggleDirection} style={{ padding: 0 }}>
                      {vertical ? <LongArrowAltRightIcon /> : <LongArrowAltDownIcon />}
                    </Button>
                  </Tooltip>
                ),
              },
            ],
          })}
        />
      }
    >
      <VisualizationSurface />
    </TopologyView>
  );
};

interface TopologyGraphProps {
  model: Model;
  onSelect: (ids: string[]) => void;
}

function createLayoutFactory(rankdir: string): LayoutFactory {
  return (_type, graph) =>
    new DagreLayout(graph, { rankdir, nodesep: 60, ranksep: 100, edgesep: 30 });
}

const TopologyGraph: React.FC<TopologyGraphProps> = ({ model, onSelect }) => {
  const [vertical, setVertical] = React.useState(false);
  const controllerRef = React.useRef<Visualization | null>(null);

  if (!controllerRef.current) {
    const vis = new Visualization();
    vis.registerComponentFactory(nodeFactory);
    vis.registerLayoutFactory(createLayoutFactory(LEFT_TO_RIGHT));
    controllerRef.current = vis;
  }

  const handleToggle = React.useCallback(() => {
    setVertical((v) => !v);
  }, []);

  return (
    <VisualizationProvider controller={controllerRef.current}>
      <TopologyGraphInner
        model={model}
        vertical={vertical}
        onToggleDirection={handleToggle}
        onSelect={onSelect}
      />
    </VisualizationProvider>
  );
};

export default TopologyGraph;
