// components/UserInfo.js
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

const UserInfo = () => {
  const [user, loading, error] = useAuthState(auth);

  if (loading) return <p>Cargando usuario...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      {user ? (
        <div>
          <p>Bienvenido, {user.displayName}!</p>
          <img src={user.photoURL} alt={user.displayName} />
        </div>
      ) : (
        <p>No has iniciado sesión.</p>
      )}
    </div>
  );
};

export default UserInfo;
