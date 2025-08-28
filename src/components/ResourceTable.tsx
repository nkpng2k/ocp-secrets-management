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

  return (
    <div className="co-m-table-grid co-m-table-grid--bordered" data-test={dataTest}>
      <div className="table-responsive">
        <table className="table table-hover">
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th key={index} role="columnheader">
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.cells.map((cell, cellIndex) => (
                  <td key={cellIndex}>
                    {cell}
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
