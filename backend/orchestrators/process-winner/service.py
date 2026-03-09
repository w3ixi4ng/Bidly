import requests
from schema import UpdateTaskRequest

def update_task_with_winner(task_id: str, winner_id: str, auction_status: str):
    update_task_request = UpdateTaskRequest(
        auction_status=auction_status,
        freelancer_id=winner_id,
    )
    response = requests.put(f"http://tasks:8005/tasks/{task_id}", json=update_task_request.model_dump(mode='json'))
    if response.status_code != 200:
        response.raise_for_status()
    return response


def get_winner(task_id: str):
    response = requests.get(f"http://bids:8003/bids/current/{task_id}")
    if response.status_code != 200:
        response.raise_for_status()
    return response