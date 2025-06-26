import React, { useState, useEffect } from 'react';

function UserSearch({ users, onUserSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    // Filter users in real-time as user types
    if (searchQuery.trim() === '') {
      setFilteredUsers([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const matched = users.filter(user => 
      user.name.toLowerCase().includes(query)
    );
    
    setFilteredUsers(matched);
  }, [searchQuery, users]);

  return (
    <div className="user-search">
      <input
        type="text"
        placeholder="Search users..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="search-input"
      />
      
      {filteredUsers.length > 0 && (
        <ul className="user-results">
          {filteredUsers.map(user => (
            <li 
              key={user.id} 
              onClick={() => onUserSelect(user)}
              className="user-item"
            >
              {user.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default UserSearch;
