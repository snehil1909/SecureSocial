import UserSearch from '../components/UserSearch';

function YourComponent() {
  const users = [
    { id: 1, name: "Piyush Kumar" },
    { id: 2, name: "Piyush Singh" },
    { id: 3, name: "John Doe" },
    { id: 4, name: "Jane Smith" },
    // ...other users
  ];

  const handleUserSelect = (user) => {
    console.log("Selected user:", user);
    // Do something with the selected user
  };

  return (
    <div>
      <h2>Find Users</h2>
      <UserSearch 
        users={users} 
        onUserSelect={handleUserSelect} 
      />
    </div>
  );
}

export default YourComponent;
