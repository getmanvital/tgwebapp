import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const FiltersBar = ({ query, size, sizes, onQueryChange, onSizeChange }) => {
    return (_jsxs("section", { className: "filters-bar", children: [_jsx("input", { type: "search", placeholder: "\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044E", value: query, onChange: (event) => onQueryChange(event.target.value) }), _jsxs("select", { value: size, onChange: (event) => onSizeChange(event.target.value), children: [_jsx("option", { value: "", children: "\u0412\u0441\u0435 \u0440\u0430\u0437\u043C\u0435\u0440\u044B" }), sizes.map((sizeOption) => (_jsx("option", { value: sizeOption, children: sizeOption }, sizeOption)))] })] }));
};
export default FiltersBar;
