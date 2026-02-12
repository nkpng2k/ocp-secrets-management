import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  EmptyState,
  EmptyStateBody,
  Title,
  Alert,
  AlertVariant,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';

interface Column {
  title: string;
  width?: number;
}

interface Row {
  cells: React.ReactNode[];
}

interface ResourceTableProps {
  columns: Column[];
  rows: Row[];
  loading?: boolean;
  error?: string;
  emptyStateTitle?: string;
  emptyStateBody?: string;
  'data-test'?: string;
}

export const ResourceTable: React.FC<ResourceTableProps> = ({
  columns,
  rows,
  loading = false,
  error,
  emptyStateTitle,
  emptyStateBody,
  'data-test': dataTest,
}) => {
  const { t } = useTranslation('plugin__ocp-secrets-management');

  if (loading) {
    return (
      <div className="co-m-loader co-an-fade-in-out" data-test={`${dataTest}-loading`}>
        <div className="co-m-loader-dot__one"></div>
        <div className="co-m-loader-dot__two"></div>
        <div className="co-m-loader-dot__three"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="co-m-pane__body" data-test={`${dataTest}-error`}>
        <Alert
          variant={AlertVariant.danger}
          title={t('Error loading resources')}
          isInline
        >
          {error}
        </Alert>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="co-m-pane__body" data-test={`${dataTest}-empty`}>
        <EmptyState>
          <SearchIcon className="co-m-empty-state__icon" />
          <Title size="lg" headingLevel="h4">
            {emptyStateTitle || t('No resources found')}
          </Title>
          <EmptyStateBody>
            {emptyStateBody || t('No resources of this type are currently available in the demo project.')}
          </EmptyStateBody>
        </EmptyState>
      </div>
    );
  }

  // Calculate column widths - distribute evenly if no widths specified
  const totalSpecifiedWidth = columns.reduce((sum, col) => sum + (col.width || 0), 0);
  const hasSpecifiedWidths = totalSpecifiedWidth > 0;
  const defaultWidth = hasSpecifiedWidths ? undefined : 100 / columns.length;

  const subtleBorder = '1px solid #3e8635';

  return (
    <div className="co-m-table-grid" data-test={dataTest} style={{ border: 'none' }}>
      <div className="table-responsive">
        <table
          className="table table-hover"
          style={{
            tableLayout: 'fixed',
            width: '100%',
            minWidth: `${columns.length * 110}px`,
            borderCollapse: 'collapse',
            border: 'none',
          }}
        >
          <thead>
            <tr style={{ borderBottom: subtleBorder }}>
              {columns.map((column, index) => {
                const width = hasSpecifiedWidths
                  ? `${(column.width || 0)}%`
                  : `${defaultWidth}%`;

                return (
                  <th
                    key={index}
                    role="columnheader"
                    style={{
                      width,
                      paddingLeft: '1rem',
                      paddingRight: '1rem',
                      textAlign: 'left',
                      verticalAlign: 'middle',
                      border: 'none',
                    }}
                  >
                    {column.title}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} style={{ borderBottom: subtleBorder }}>
                {columns.map((_column, colIndex) => (
                  <td
                    key={colIndex}
                    style={{
                      paddingLeft: '1rem',
                      paddingRight: '1rem',
                      textAlign: 'left',
                      verticalAlign: 'middle',
                      wordWrap: 'break-word',
                      overflow: 'hidden',
                      border: 'none',
                    }}
                  >
                    {row.cells[colIndex] ?? null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
