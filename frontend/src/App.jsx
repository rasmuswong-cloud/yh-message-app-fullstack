import { useState, useEffect, useCallback } from "react"
import { BASE_URL } from "./api"
import { PostMessage } from "./components/PostMessage"
import { MessageList } from "./components/MessageList"
import { AuthModal } from "./components/AuthModal"

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000
const ACTIVITY_EVENTS = ["click", "keydown", "scroll", "mousemove", "touchstart"]

export const App = () => {
  const [loading, setLoading] = useState(false)
  const [messageList, setMessageList] = useState([])
  const [user, setUser] = useState(null)
  const [modal, setModal] = useState(null)
  const [error, setError] = useState(null)

  const fetchPosts = () => {
    setLoading(true)
    fetch(`${BASE_URL}/messages`)
      .then((res) => res.json())
      .then((data) => setMessageList(data))
      .catch((error) => console.error(error))
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    fetchPosts()
  }, [])

  const addNewPost = (newMessage) => {
    setMessageList([newMessage, ...messageList])
  }

  const logout = useCallback((message = null) => {
    setUser(null)
    setError(message)
  }, [])

  const handleUnauthorized = useCallback(() => {
    logout("Your session has expired, please log in again")
  }, [logout])

  useEffect(() => {
    if (!user) return undefined

    let inactivityTimer

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer)
      inactivityTimer = setTimeout(() => {
        logout("You were logged out after 30 minutes of inactivity")
      }, INACTIVITY_TIMEOUT_MS)
    }

    resetInactivityTimer()
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetInactivityTimer, { passive: true })
    })

    return () => {
      clearTimeout(inactivityTimer)
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetInactivityTimer)
      })
    }
  }, [user, logout])
    
  return (
    <>
        {user ? (
          <div className="user-info">
            <span>{user.response.username}</span>
            <button
              onClick={() => logout()}
              className="auth-button"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="auth-buttons">
            <button
              onClick={() => setModal("login")}
              className="auth-button"
            >
              Login
            </button>
            <button
              onClick={() => setModal("register")}
              className="auth-button"
            >
              Register
            </button>
          </div>
        )}
      {modal && (
        <AuthModal
          mode={modal}
          onClose={() => setModal(null)}
          onSuccess={(data) => { 
            console.log("User logged in:", data)
            setUser(data) 
            setError(null)
            setModal(null) 
          }}
        />
      )}
      {error && <p className="error">{error}</p>}
      <PostMessage newMessage={addNewPost} fetchPosts={fetchPosts} user={user} onUnauthorized={handleUnauthorized} />
      <MessageList
        loading={loading}
        messageList={messageList}
        setMessageList={setMessageList}
        fetchPosts={fetchPosts}
        user={user}
        onUnauthorized={handleUnauthorized}
      />
    </>
  )
}
