import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const CollectionCard = ({ collection, isActive, onClick }) => {
    // Выбираем лучшее фото из доступных размеров
    const image = collection.photo?.sizes?.find((s) => s.type === 'x' || s.type === 'y')?.url ||
        collection.photo?.sizes?.find((s) => s.type === 'm')?.url ||
        collection.photo?.sizes?.[collection.photo.sizes.length - 1]?.url ||
        'https://via.placeholder.com/300x200?text=No+Image';
    return (_jsxs("article", { className: `collection-card ${isActive ? '--active' : ''}`, onClick: onClick, role: "button", tabIndex: 0, onKeyDown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
            }
        }, children: [_jsxs("div", { className: "collection-card__image", children: [_jsx("img", { src: image, alt: collection.title }), collection.count !== undefined && (_jsxs("span", { className: "collection-card__count", children: [collection.count, " \u0442\u043E\u0432\u0430\u0440\u043E\u0432"] }))] }), _jsx("h3", { className: "collection-card__title", children: collection.title })] }));
};
export default CollectionCard;
