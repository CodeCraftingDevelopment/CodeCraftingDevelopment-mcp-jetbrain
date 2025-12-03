import { TestMCP } from './components/TestMCP'
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Test d'intégration MCP</h1>
        <p className="text-gray-600">Connexion à l'API MCP de JetBrains</p>
      </header>
      
      <main className="max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <TestMCP />
        </div>
      </main>
      
      <footer className="mt-12 text-center text-sm text-gray-500">
        <p>Serveur MCP sur http://127.0.0.1:64342/sse</p>
      </footer>
    </div>
  )
}

export default App
