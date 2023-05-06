const ListItem = ({ name, date, id, onRemoveHandler}) => {
  const removeHandler = ()=>{
    onRemoveHandler(id)
  }
  return (
    <div className="list-item">
      <div className="task-name item">{name}</div>
      <div className="task-date item">{date.toLocaleDateString()}</div>
      <button
        className="w3-button w3-blue w3-border w3-border-white w3-round-large"
        type="submit" onClick={removeHandler}
      >
        Remove
      </button>
    </div>
  );
};
export default ListItem;
