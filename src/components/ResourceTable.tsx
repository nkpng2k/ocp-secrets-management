import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  EmptyState,
  EmptyStateBody,
  Title,
  Spinner,
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
      <EmptyState data-test={`${dataTest}-loading`}>
        <Spinner />
        <Title size="lg" headingLevel="h4">
          {t('Loading resources...')}
        </Title>
      </EmptyState>
    );
  }

  if (error) {
    return (
      <Alert
        variant={AlertVariant.danger}
        title={t('Error loading resources')}
        data-test={`${dataTest}-error`}
      >
        {error}
      </Alert>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState data-test={`${dataTest}-empty`}>
        <SearchIcon />
        <Title size="lg" headingLevel="h4">
          {emptyStateTitle || t('No resources found')}
        </Title>
        <EmptyStateBody>
          {emptyStateBody || t('No resources of this type are currently available in the demo project.')}
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <div className="pf-c-table pf-m-compact" data-test={dataTest}>
      <table className="pf-c-table__table" role="grid" aria-label="Resource table">
        <thead className="pf-c-table__thead">
          <tr className="pf-c-table__tr" role="row">
            {columns.map((column, index) => (
              <th key={index} className="pf-c-table__th" role="columnheader">
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="pf-c-table__tbody">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="pf-c-table__tr" role="row">
              {row.cells.map((cell, cellIndex) => (
                <td key={cellIndex} className="pf-c-table__td" role="gridcell">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
