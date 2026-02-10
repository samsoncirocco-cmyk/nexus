from backend.execution.semantic_layer import SemanticLayer
import os
import logging

logging.basicConfig(level=logging.INFO)

def main():
    project_id = "killuacode" # Correct project ID
    vault_path = os.path.abspath("vault")
    
    print(f"Starting vault indexer for project {project_id}...")
    print(f"Vault path: {vault_path}")
    
    try:
        semantic = SemanticLayer(project_id)
        # Process in smaller batches or handle timeouts
        print("Initializing semantic layer...")
        count = semantic.embed_vault(vault_path)
        print(f"Done! Indexed {count} documents.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
