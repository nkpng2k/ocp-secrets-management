import * as React from 'react';
import {
  Model,
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
  useVisualizationController,
} from '@patternfly/react-topology';
import nodeFactory from './nodes/nodeFactory';
import './TopologyGraph.css';

interface TopologyGraphInnerProps {
  model: Model;
  onSelect: (ids: string[]) => void;
}

const TopologyGraphInner: React.FC<TopologyGraphInnerProps> = ({ model, onSelect }) => {
  const controller = useVisualizationController();
  const initialized = React.useRef(false);

  React.useEffect(() => {
    controller.addEventListener<SelectionEventListener>(SELECTION_EVENT, onSelect);
    return () => {
      controller.removeEventListener(SELECTION_EVENT, onSelect);
    };
  }, [controller, onSelect]);

  React.useEffect(() => {
    controller.fromModel(model, initialized.current);
    if (!initialized.current && model.nodes && model.nodes.length > 0) {
      initialized.current = true;
    }
  }, [model, controller]);

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

const TopologyGraph: React.FC<TopologyGraphProps> = ({ model, onSelect }) => {
  const controllerRef = React.useRef<Visualization | null>(null);
  if (!controllerRef.current) {
    const vis = new Visualization();
    vis.registerComponentFactory(nodeFactory);
    vis.registerLayoutFactory((type, graph) =>
      new DagreLayout(graph, {
        rankdir: LEFT_TO_RIGHT,
        nodesep: 60,
        ranksep: 100,
        edgesep: 30,
      }),
    );
    controllerRef.current = vis;
  }

  return (
    <VisualizationProvider controller={controllerRef.current}>
      <TopologyGraphInner model={model} onSelect={onSelect} />
    </VisualizationProvider>
  );
};

export default TopologyGraph;
