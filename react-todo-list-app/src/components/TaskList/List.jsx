import ListItem from "./ListItem";
const List = ({ tasks,onRemoveHandler }) => {
  
  return (
    <div className="tasklist">
      {tasks.map(({ name, date, id }) => (
        <ListItem
          name={name}
          date={date}
          id={id}
          onRemoveHandler={onRemoveHandler}
        />
      ))}
    </div>
  );
};
export default List;
