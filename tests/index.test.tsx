import React from "react";
import { columns, dataSource } from "../fixtures/table";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { Table } from "../src";

// tests using ant not working without it.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

if (typeof window.URL.createObjectURL === "undefined") {
  Object.defineProperty(window.URL, "createObjectURL", {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    value: jest.fn(() => {}),
  });
}

test("Renders default table", async () => {
  // render(<Table dataSource={dataSource} columns={columns} />);
  render(<Table dataSource={dataSource} columns={columns} />);
  expect(screen.getByText(dataSource[0].firstName)).toBeInTheDocument();
  expect(screen.getByText(dataSource[0].lastName)).toBeInTheDocument();
  expect(screen.getByText(dataSource[0].country)).toBeInTheDocument();
});

test("Renders searchable table", async () => {
  render(<Table dataSource={dataSource} columns={columns} searchable />);
  expect(screen.getByText(dataSource[0].firstName)).toBeInTheDocument();
  expect(screen.getByText(dataSource[0].lastName)).toBeInTheDocument();
  expect(screen.getByText(dataSource[0].country)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
});

test("Renders exportable table", async () => {
  render(<Table dataSource={dataSource} columns={columns} exportable />);
  expect(screen.getByText(dataSource[0].firstName)).toBeInTheDocument();
  expect(screen.getByText(dataSource[0].lastName)).toBeInTheDocument();
  expect(screen.getByText(dataSource[0].country)).toBeInTheDocument();
  const btn = screen.getByRole("button", { name: /export/i });
  expect(btn).toBeInTheDocument();
});

test("Renders searchable & exportable table", async () => {
  render(
    <Table dataSource={dataSource} columns={columns} searchable exportable />
  );
  expect(screen.getByText(dataSource[0].firstName)).toBeInTheDocument();
  expect(screen.getByText(dataSource[0].lastName)).toBeInTheDocument();
  expect(screen.getByText(dataSource[0].country)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  const btn = screen.getByRole("button", { name: /export/i });
  expect(btn).toBeInTheDocument();
});

test("Renders export column picker on export button click", async () => {
  render(
    <Table
      dataSource={dataSource}
      columns={columns}
      searchable
      exportable
      exportableProps={{ showColumnPicker: true }}
    />
  );
  expect(screen.getByText(dataSource[0].firstName)).toBeInTheDocument();
  expect(screen.getByText(dataSource[0].lastName)).toBeInTheDocument();
  expect(screen.getByText(dataSource[0].country)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  const btn = screen.getByRole("button", { name: /export/i });
  expect(btn).toBeInTheDocument();
  fireEvent.click(btn);

  expect(screen.getByText(/select columns to export/i)).toBeInTheDocument();
});

test("Searches in searchable table", async () => {
  render(<Table dataSource={dataSource} columns={columns} searchable />);
  expect(screen.getByText(dataSource[0].lastName)).toBeInTheDocument();
  expect(screen.getByText(dataSource[1].lastName)).toBeInTheDocument();
  const searchBox = screen.getByPlaceholderText(/search/i);
  expect(searchBox).toBeInTheDocument();
  userEvent.type(searchBox, dataSource[1].lastName);
  await waitFor(() =>
    expect(screen.queryByText(dataSource[0].lastName)).not.toBeInTheDocument()
  );
  expect(screen.getByText(dataSource[1].lastName)).toBeInTheDocument();
});

test("Searches in modified dataSource", async () => {
  const { rerender } = render(
    <Table dataSource={dataSource} columns={columns} searchable />
  );
  expect(screen.getByText(dataSource[0].lastName)).toBeInTheDocument();
  expect(screen.getByText(dataSource[1].lastName)).toBeInTheDocument();
  const searchBox = screen.getByPlaceholderText(/search/i);
  expect(searchBox).toBeInTheDocument();
  act(() => {
    userEvent.type(searchBox, dataSource[1].lastName);
  });
  await waitFor(() =>
    expect(screen.queryByText(dataSource[0].lastName)).not.toBeInTheDocument()
  );
  expect(screen.getByText(dataSource[1].lastName)).toBeInTheDocument();

  const newDataSource = dataSource.slice(2, 5);
  act(() => {
    rerender(<Table dataSource={newDataSource} columns={columns} searchable />);
  });
  expect(screen.queryByText(/no data/i)).not.toBeInTheDocument();
  // await wait(2000);
  await waitFor(() =>
    expect(screen.queryByText(dataSource[0].lastName)).not.toBeInTheDocument()
  );
  await waitFor(() =>
    expect(screen.queryByText(dataSource[1].lastName)).not.toBeInTheDocument()
  );
  await waitFor(() =>
    expect(screen.getByText(dataSource[2].lastName)).toBeInTheDocument()
  );
  const newSearchBox = screen.getByPlaceholderText(/search/i);

  await waitFor(() => expect(newSearchBox).toBeInTheDocument());

  act(() => {
    userEvent.clear(newSearchBox);
    userEvent.type(newSearchBox, newDataSource[1].lastName);
  });

  await waitFor(() =>
    expect(
      screen.queryByText(newDataSource[0].lastName)
    ).not.toBeInTheDocument()
  );

  expect(screen.queryByText(newDataSource[1].lastName)).toBeInTheDocument();
});

test("Keeps results filtered if dataSource changed and input has previous value", async () => {
  const { rerender } = render(
    <Table dataSource={dataSource} columns={columns} searchable />
  );

  expect(screen.getByText(dataSource[0].lastName)).toBeInTheDocument();
  expect(screen.getByText(dataSource[1].lastName)).toBeInTheDocument();
  const searchBox = screen.getByPlaceholderText(/search/i);
  expect(searchBox).toBeInTheDocument();

  userEvent.type(searchBox, dataSource[1].lastName);
  await waitFor(() =>
    expect(screen.queryByText(dataSource[0].lastName)).not.toBeInTheDocument()
  );

  expect(screen.getByText(dataSource[1].lastName)).toBeInTheDocument();

  const newDataSource = dataSource.slice(0);
  rerender(<Table dataSource={newDataSource} columns={columns} searchable />);
  expect(screen.queryByText(/no data/i)).not.toBeInTheDocument();

  await waitFor(() =>
    expect(screen.queryByText(dataSource[0].lastName)).not.toBeInTheDocument()
  );

  expect(screen.getByText(dataSource[1].lastName)).toBeInTheDocument();
});

test("Exports csv file on export btn click", async () => {
  render(<Table dataSource={dataSource} columns={columns} exportable />);
  expect(screen.getByText(dataSource[0].firstName)).toBeInTheDocument();
  expect(screen.getByText(dataSource[0].lastName)).toBeInTheDocument();
  expect(screen.getByText(dataSource[0].country)).toBeInTheDocument();
  const btn = screen.getByRole("button", { name: /export/i });
  expect(btn).toBeInTheDocument();
  userEvent.click(btn);

  // To avoid some window.navigation error temporarily.
  console.error = jest.fn();
  await waitFor(() => expect(window.URL.createObjectURL).toHaveBeenCalled());
});

test("Searches objects in dataSource in searchable", async () => {
  const _dataSource = [
    {
      key: -1,
      firstName: "test_fname",
      lastName: "test_lname",
      contact: {
        name: "pikachu",
      },
    },
    ...dataSource,
  ];

  const _columns = [
    ...columns,
    {
      dataIndex: ["contact", "name"],
    },
  ];

  render(<Table dataSource={_dataSource} columns={_columns} searchable />);
  expect(screen.getByText(dataSource[0].firstName)).toBeInTheDocument();
  expect(screen.getByText(dataSource[0].lastName)).toBeInTheDocument();
  expect(screen.getByText(dataSource[0].country)).toBeInTheDocument();

  expect(screen.getByText(dataSource[1].lastName)).toBeInTheDocument();

  const searchBox = screen.getByPlaceholderText(/search/i);
  expect(searchBox).toBeInTheDocument();

  userEvent.type(searchBox, "pikachu");
  expect(screen.queryByText("pikachu")).toBeInTheDocument();
});

test("Searches tables with columns with empty dataIndex", async () => {
  const _dataSource = [
    {
      key: -1,
      firstName: "test_fname",
      lastName: "test_lname",
      contact: {
        name: "pikachu",
      },
    },
    ...dataSource,
  ];

  const _columns = [
    ...columns,
    {
      dataIndex: ["contact", "name"],
    },
    {
      dataIndex: "",
    },
  ];

  render(<Table dataSource={_dataSource} columns={_columns} searchable />);
  expect(screen.getByText(dataSource[0].firstName)).toBeInTheDocument();
  expect(screen.getByText(dataSource[0].lastName)).toBeInTheDocument();
  expect(screen.getByText(dataSource[0].country)).toBeInTheDocument();

  expect(screen.getByText(dataSource[1].lastName)).toBeInTheDocument();

  const searchBox = screen.getByPlaceholderText(/search/i);
  expect(searchBox).toBeInTheDocument();

  userEvent.type(searchBox, "pikachu");
  expect(screen.queryByText("pikachu")).toBeInTheDocument();
});

test("Searches tables with grouped headers", async () => {
  const _dataSource = [
    {
      key: -1,
      firstName: "test_fname",
      lastName: "test_lname",
      companyName: "test_company",
      companyAddress: "test_companyAddress",
    },
    ...dataSource,
  ];

  const _columns = [
    ...columns,
    {
      title: "Company",
      children: [
        {
          title: "Company Address",
          dataIndex: "companyAddress",
          key: "companyAddress",
          width: 200,
        },
        {
          title: "Company Name",
          dataIndex: "companyName",
          key: "companyName",
        },
      ],
    },
  ];

  render(<Table dataSource={_dataSource} columns={_columns} searchable />);
  expect(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    screen.getByText((_dataSource[0] as any).companyName)
  ).toBeInTheDocument();
  expect(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    screen.getByText((_dataSource[0] as any).companyAddress)
  ).toBeInTheDocument();

  const searchBox = screen.getByPlaceholderText(/search/i);
  expect(searchBox).toBeInTheDocument();

  userEvent.type(searchBox, "test_company");
  expect(screen.queryByText("test_companyAddress")).toBeInTheDocument();
});
