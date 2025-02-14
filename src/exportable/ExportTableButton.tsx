import React, { Fragment, useEffect, useMemo } from "react";
import { Button, Modal, Checkbox } from "antd";
import { unparse } from "papaparse";
import get from "lodash/get";
import {
  ColumnGroupType,
  ColumnType,
  ColumnsType,
  ObjectColumnExporter,
} from "../types";
import type {
  CustomDataSourceType,
  ExportFieldButtonProps,
  TableExportFields,
} from "../types";

const getFieldsFromColumns = <T,>(
  columns: ColumnsType<T>,
  props: ExportFieldButtonProps = {},
  fields: TableExportFields = {}
): TableExportFields => {
  const { autoPickAllColumns } = props;
  for (const column of columns) {
    const { children } = column as ColumnGroupType<T>;

    if (children) {
      fields = getFieldsFromColumns(children, props, fields);
    }

    const { title, key, dataIndex, exporter } = column as ColumnType<T>;
    const fieldName =
      (Array.isArray(dataIndex) ? dataIndex.join(".") : dataIndex) ??
      key?.toString();

    if (!fieldName) {
      continue;
    }

    const _fieldName = fieldName as string | number;
    const _title = typeof title === "string" ? title : _fieldName ?? "No Title";

    if (exporter) {
      const _exporter: ObjectColumnExporter<T> = {
        header: _title,
        formatter:
          typeof exporter === "function" ? exporter : exporter.formatter,
      };

      fields[_fieldName] = _exporter;
      continue;
    }

    if (autoPickAllColumns) {
      fields[_fieldName] = _title;
    }
  }

  return fields;
};

const cleanupDataSource = <T,>(
  dataSource: CustomDataSourceType<T>,
  exportFieldNames: TableExportFields,
  selectedFields: string[]
): any => {
  if (!dataSource || dataSource.length === 0) {
    return { data: [], fields: [] };
  }

  const newData = [...dataSource];
  const fields = selectedFields.map((fieldName) => {
    const fieldValue = get(exportFieldNames, fieldName);
    if (typeof fieldValue === "string" || typeof fieldValue === "number") {
      return fieldValue;
    }
    return fieldValue.header || "";
  });

  const data = newData.map((record, rowIndex) => {
    return selectedFields.map((fieldName) => {
      const fieldValue = get(exportFieldNames, fieldName);
      const recordValue: any = get(record, fieldName);
      if (typeof fieldValue === "string" || typeof fieldValue === "number") {
        return recordValue;
      }
      return fieldValue?.formatter?.(recordValue, record, rowIndex);
    });
  });

  return [fields, ...data];
};

export const ExportTableButton: React.FC<ExportFieldButtonProps> = (props) => {
  const {
    dataSource = [],
    fileName,
    fields,
    disabled,
    btnProps,
    modalProps,
    columns = [],
    showColumnPicker = false,
    papaparseConfig = {},
    autoPickAllColumns = true,
  } = props;

  const defaultFields = useMemo(
    () => getFieldsFromColumns(columns, { ...props, autoPickAllColumns }),
    [autoPickAllColumns, columns, props]
  );

  const [showModal, setShowModal] = React.useState(false);

  const fieldsOrColumns = useMemo(
    () => fields ?? defaultFields,
    [defaultFields, fields]
  );

  const [selectedFields, setSelectedFields] = React.useState(() => {
    if (fields) {
      return Object.keys(fields);
    } else if (columns) {
      return Object.keys(defaultFields);
    }

    return [];
  });

  useEffect(() => {
    if (fields) {
      setSelectedFields(Object.keys(fields));
    } else if (columns) {
      setSelectedFields(Object.keys(defaultFields));
    }
  }, [fields, columns, defaultFields]);

  const handleDownloadCSV = React.useCallback(() => {
    if (!dataSource) {
      return;
    }

    const selectedFieldsInOriginalOrder = Object.keys(fieldsOrColumns).filter(
      (name) => selectedFields.indexOf(name) > -1
    );

    console.log("fieldsOrColumns:", fieldsOrColumns);
    const data = cleanupDataSource(
      dataSource,
      fieldsOrColumns,
      selectedFieldsInOriginalOrder
    );

    console.log("data:", data);
    const csv = unparse(data, {
      skipEmptyLines: "greedy",
      header: false,
      ...papaparseConfig,
    });
    const blob = new Blob([csv]);
    const a = window.document.createElement("a");
    a.href = window.URL.createObjectURL(blob);
    a.download = `${fileName || "table"}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setShowModal(false);
  }, [dataSource, fieldsOrColumns, papaparseConfig, fileName, selectedFields]);

  const handleCheckboxChange = React.useCallback(
    (key: string, checked: boolean) => {
      let newSelectedFields = [...selectedFields];
      if (checked) {
        newSelectedFields = Array.from(new Set([...newSelectedFields, key]));
      } else {
        newSelectedFields = newSelectedFields.filter((field) => field !== key);
      }

      setSelectedFields(newSelectedFields);
    },
    [selectedFields]
  );

  return (
    <Fragment>
      <Button
        onClick={(): void =>
          showColumnPicker ? setShowModal(true) : handleDownloadCSV()
        }
        disabled={disabled}
        {...btnProps}
      >
        {props.children ?? `Export to CSV`}
      </Button>
      {showColumnPicker ? (
        <Modal
          open={showModal}
          onOk={(): void => handleDownloadCSV()}
          onCancel={(): void => setShowModal(false)}
          width={400}
          okButtonProps={{
            disabled: selectedFields.length < 1,
            title:
              selectedFields.length < 1
                ? "Please select at least one column."
                : undefined,
          }}
          okText={"Export"}
          title={"Select columns to export"}
          {...modalProps}
        >
          <div className="d-flex flex-column align-start">
            {Object.entries(fieldsOrColumns).map(([key, value]) => {
              return (
                <Checkbox
                  key={key}
                  style={{ padding: 0, margin: 0 }}
                  defaultChecked={true}
                  checked={selectedFields.indexOf(key) > -1}
                  onChange={(e): void =>
                    handleCheckboxChange(key, e.target.checked)
                  }
                >
                  {typeof value === "string" || typeof value === "number"
                    ? value
                    : value?.header ?? ""}
                </Checkbox>
              );
            })}
          </div>
        </Modal>
      ) : null}
    </Fragment>
  );
};

export default ExportTableButton;
